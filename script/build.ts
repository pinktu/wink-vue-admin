import shell from 'shelljs'

shell.cd('packages/web')
shell.exec('npm run build')
shell.mv('dist', '../../')
shell.cd('../api')
shell.exec('npm run build')
shell.exec('pm2 restart wink-api')
