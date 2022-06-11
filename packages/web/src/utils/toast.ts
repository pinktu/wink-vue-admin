import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'

export const toast = (message: string, type: 'error' | 'success' = 'error') => {
	if (type === 'error') {
		ElMessage.error(message)
	} else {
		ElMessage({ message, type })
	}
}
