import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UpdatePluginDto } from './dto/update-plugin.dto'
import { Plugin } from './entities/plugin.entity'
import { isNotNull } from '@/common/utils/isNotNull'
import { Express } from 'express'
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import {
	nodeParser,
	analyse,
	getModuleName,
	getModuleDescription,
	getRouterInfo,
	translate,
	getModuleComment,
	clearModule
} from '@wink/compile'
import { BadParamsException } from '@/common/exception/bad-params-exception'
import { DefaultPluginInfo } from '@/config/plugin'
import { Permission } from '@/permission/entities/permission.entity'

@Injectable()
export class PluginService {
	constructor(
		@InjectRepository(Plugin) private readonly pluginRepository: Repository<Plugin>,
		@InjectRepository(Plugin) private readonly permissionRepository: Repository<Permission>
	) {}

	async create(file: Express.Multer.File) {
		const { originalname, buffer } = file
		const staticDir = join(__dirname, '../../static')
		if (!existsSync(staticDir)) {
			mkdirSync(staticDir)
		}
		const { data, error } = analyse(buffer.toString())
		if (error) throw new BadParamsException('40019')
		const astNode = await nodeParser(data)

		const pluginName = getModuleName(astNode)
		const pluginNameCount = await this.pluginRepository.countBy({ key: pluginName })
		if (DefaultPluginInfo.pluginNames.includes(pluginName) || pluginNameCount > 0)
			throw new BadParamsException('40021')

		const routerInfo = getRouterInfo(astNode)
		const routeName = routerInfo.name
		const routeNameCount = await this.pluginRepository.countBy({ routeName })
		if (DefaultPluginInfo.routeNames.includes(routeName) || routeNameCount > 0)
			throw new BadParamsException('40022')

		const routePath = `${routerInfo.parentPath}/${routerInfo.path}`
		const routerPathCount = await this.pluginRepository.countBy({ routePath: routePath })
		if (DefaultPluginInfo.routePaths.includes(routePath) || routerPathCount > 0)
			throw new BadParamsException('40020')

		translate(astNode)
		const description = getModuleDescription(astNode)
		const comment = getModuleComment(astNode)
		await this.pluginRepository.save({
			name: comment,
			key: pluginName,
			description,
			url: join('/static/', originalname),
			routeName,
			routePath
		})
		const permissionCount = await this.permissionRepository.countBy({ key: routerInfo.name })
		if (permissionCount > 0) throw new BadParamsException('40023')
		const parentPermission = await this.permissionRepository.findOneBy({ key: routerInfo.parentName })
		const parentId = parentPermission ? parentPermission.id : null
		await this.permissionRepository.save({ title: comment, description, parentId, key: routerInfo.name })
		const currentPermission = await this.permissionRepository.findOneBy({ key: routerInfo.name })
		await this.permissionRepository.save({
			title: `添加${comment}`,
			description: `添加${description}权限`,
			parentId: currentPermission.id,
			key: `${routerInfo.parentPath}_${routerInfo.path}_add`
		})
		await this.permissionRepository.save({
			title: `修改${comment}`,
			description: `修改${description}权限`,
			parentId: currentPermission.id,
			key: `${routerInfo.parentPath}_${routerInfo.path}_update`
		})
		await this.permissionRepository.save({
			title: `删除${comment}`,
			description: `删除${description}权限`,
			parentId: currentPermission.id,
			key: `${routerInfo.parentPath}_${routerInfo.path}_delete`
		})

		await writeFileSync(join(__dirname, staticDir, originalname), buffer)
	}

	async findAll(skip: number, take: number, search?: string) {
		if (isNotNull(skip) && isNotNull(take)) {
			let queryBuilder = this.pluginRepository.createQueryBuilder('plugin')
			if (search) {
				queryBuilder = queryBuilder
					.where('role.title like :search', { search: `%${search}%` })
					.orWhere('role.description like :search', { search: `%${search}%` })
			}
			const [list, total] = await queryBuilder.skip(skip).take(take).getManyAndCount()
			return {
				list,
				total
			}
		}
		return this.pluginRepository.find()
	}

	findOne(id: number) {
		return this.pluginRepository.findOneBy({ id })
	}

	update(id: number, updatePluginDto: UpdatePluginDto) {
		const pluginDto: any = {}
		const { name, description } = updatePluginDto
		if (name) pluginDto.name = name
		if (description) pluginDto.description = description
		return this.pluginRepository.update(id, pluginDto)
	}

	async remove(rid: number) {
		const pluginInfo = await this.pluginRepository.findOneBy({ id: rid })
		if (!pluginInfo) throw new BadParamsException('40024')

		const filePath = join(__dirname, '../../', pluginInfo.url)
		const { data, error } = analyse(readFileSync(filePath).toString())
		if (error) throw new BadParamsException('40019')
		const astNode = await nodeParser(data)
		const routerInfo = getRouterInfo(astNode)
		clearModule(pluginInfo.key, routerInfo)

		const currentPermission = await this.permissionRepository.findOneBy({ key: pluginInfo.routeName })
		if (!currentPermission) throw new BadParamsException('40025')
		await this.permissionRepository.softDelete({ parentId: currentPermission.id })
		await this.permissionRepository.softDelete(currentPermission.id)
		return this.pluginRepository.softDelete(rid)
	}
}
