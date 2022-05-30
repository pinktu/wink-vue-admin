import { resolve } from 'path'

const PathConfig = {
	appModulePath: '',
	outDir: '',
	outVueDir: '',
	routerPath: ''
}

export const getConfigPath = () => PathConfig

export const setConfigPath = (config: Partial<typeof PathConfig>) => {
	if (config.appModulePath) PathConfig.appModulePath = resolve(process.cwd(), config.appModulePath)
	if (config.outDir) PathConfig.outDir = config.outDir
	if (config.outVueDir) PathConfig.outVueDir = config.outVueDir
	if (config.routerPath) PathConfig.routerPath = config.routerPath
}