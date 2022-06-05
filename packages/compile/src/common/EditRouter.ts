import { resolve } from 'path'
import { ObjectLiteralExpression, Project, SyntaxKind } from 'ts-morph'

interface RouteConfig {
	path: string
	name: string
	viewPath: string
	title: string
	icon: string
}

const genRouterStr = (config: RouteConfig) => `{
	path: '${config.path}',
	component: () => import('@/views/${config.viewPath}/list.vue'),
	name: '${config.name}',
	meta: {
		title: '${config.title}',
		icon: '${config.icon}'
	}
}`

export const editVueRouter = (config: RouteConfig, handleType: 'add' | 'remove' = 'add') => {
	const path = resolve(__dirname, '../example/main.ts')
	const project = new Project()
	project.addSourceFileAtPath(path)
	const sourceFile = project.getSourceFileOrThrow(path)

	const SuperAdminRoute = sourceFile.getVariableDeclarationOrThrow('SuperAdminRoute')
	const init = SuperAdminRoute.getInitializerOrThrow()
	const obj = init as ObjectLiteralExpression
	const children = obj.getPropertyOrThrow('children')
	const routerChildren = children.getFirstChildByKindOrThrow(SyntaxKind.ArrayLiteralExpression)
	if (handleType === 'add') {
		routerChildren.addElement(genRouterStr(config))
	} else {
		const element = routerChildren.getElements()
		for (let i = 0; i < element.length; i++) {
			const item = element[i]
			const str = item.getText()
			if (str.includes(config.path)) {
				routerChildren.removeElement(i)
			}
		}
	}
	sourceFile.saveSync()
}