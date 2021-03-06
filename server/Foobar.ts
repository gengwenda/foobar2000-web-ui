/* eslint-disable @typescript-eslint/no-var-requires */

import * as child_process from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

import * as Message from './Message'
import * as ControlServer from './ControlServer'
import { Context, Config, FB2KInstance, Action } from './Models'
import { Logger } from 'Logger'

export function launch(config: Config, logger: Logger): Promise<FB2KInstance> {
    if (os.platform() !== 'win32') {
        const MockControlServer = require('./MockControlServer')
        MockControlServer.createServer('127.0.0.1', config.controlServerPort)

        return new Promise(resolve => resolve(null))
    }

    const normalizedPath = `${path.normalize(config.foobarPath)}/`

    if (fs.readdirSync(normalizedPath).indexOf('foobar2000.exe') === -1) {
        throw new Error(
            'Foobar2000.exe was not found in the path specified in configuration'
        )
    }

    const fb2kInstance: FB2KInstance = child_process.spawn('foobar2000.exe', {
        cwd: config.foobarPath,
        detached: true
    })

    return ControlServer.probe(config.controlServerPort).then(() => {
        logger.info('Control server detected')
        return fb2kInstance
    })
}

export function queryTrackInfo(ctx: Context, io: SocketIO.Server) {
    return sendCommand(ctx, io, 'trackinfo')
}

// TODO move launchFoobar logic out of this module
export function sendCommand(
    ctx: Context,
    io: SocketIO.Server,
    command: Action | 'launchFoobar'
) {
    ctx.logger.debug('Command received', { command })

    if (command === 'launchFoobar') {
        return launch(ctx.config, ctx.logger)
            .then(i => {
                ctx.instance = i
                io.sockets.emit('foobarStarted')
            })
            .catch(() => {
                ctx.logger.warn('Could not launch Foobar')
                io.sockets.emit('controlServerError', 'Could not launch Foobar')
            })
    }

    return ControlServer.sendCommand(ctx, command)
}

export function onData(ctx: Context, io: SocketIO.Server) {
    return function controlDataHandler(data: Buffer) {
        const dataStr = data.toString('utf-8')
        const messages = Message.parseControlData(dataStr)

        ctx.logger.debug('Received message(s) from control server', {
            raw: dataStr,
            messages
        })

        messages.forEach(message => {
            io.sockets.emit('message', message)
        })
    }
}
