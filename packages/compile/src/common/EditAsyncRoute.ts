import { resolve } from 'path'
import { Project, SyntaxKind } from 'ts-morph'

export const editAsyncRoute = (filePath: string, prefixModuleName: string, handleType: 'add' | 'remove' = 'add') => {
	const path = resolve(__dirname, '../example/asyncRoute.ts')
	const project = new Project()

	project.addSourceFileAtPath(path)
	const sourceFile = project.getSourceFileOrThrow(path)
	if (handleType === 'add') {
		sourceFile.addImportDeclarations([
			{
				namedImports: [`${prefixModuleName}`],
				moduleSpecifier: `./${filePath}`
			}
		])
	} else {
		const moduleImport = sourceFile.getImportDeclarationOrThrow(`./${filePath}`)
		moduleImport.remove()
	}

	const asyncRoutes = sourceFile.getVariableDeclarationOrThrow('asyncRoutes')

	const array = asyncRoutes.getFirstChildByKindOrThrow(SyntaxKind.ArrayLiteralExpression)
	if (handleType === 'add') {
		array.addElement(`${prefixModuleName}`)
	} else {
		const element = array.getElements()
		for (let i = 0; i < element.length; i++) {
			const item = element[i]
			const str = item.getText()
			if (str === prefixModuleName) {
				array.removeElement(i)
			}
		}
	}
	sourceFile.saveSync()
}