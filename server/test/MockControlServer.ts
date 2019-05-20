import * as net from 'net'
import { mockTrack1, mockTrack2 } from './fixtures'

const _: any = require('lodash')

const initialMsg = `
999|Connected to foobar2000 Control Server v1.0.1|\r\n
999|Accepted client from 127.0.0.1|\r\n
999|There are currently 1/10 clients connected|\r\n
999|Type '?' or 'help' for command information|\r\n
`
const mockTrackInfoResponse = (trackInfo: any) =>
    `111|3|282|${trackInfo.secondsPlayed}|FLAC|605|${trackInfo.artist}|${
        trackInfo.album
    }|2013|Post-rock|?|${trackInfo.track}|${trackInfo.trackLength}|`
const mockVolResponse = '222|0.0|'

function onConnection(socket: net.Socket) {
    let currentTrack: any = _.clone(mockTrack1)

    socket.write(initialMsg)

    let interval = setInterval(() => {
        const nextSecondsPlayed = Number(currentTrack.secondsPlayed) + 1

        if (Number(currentTrack.trackLength) <= nextSecondsPlayed) {
            currentTrack = _.clone(
                currentTrack.trackNumber == '01' ? mockTrack2 : mockTrack1
            )
        } else {
            currentTrack.secondsPlayed = nextSecondsPlayed
        }
        socket.write(mockTrackInfoResponse(currentTrack))
    }, 1000)

    socket.on('data', data => {
        const stringData = data.toString()

        if (_.startsWith('trackinfo', stringData)) {
            return socket.write(mockTrackInfoResponse(currentTrack))
        }

        if (_.startsWith('vol', stringData)) {
            return socket.write(mockVolResponse)
        }

        return false
    })

    socket.on('close', () => clearInterval(interval))
}

export function createServer(host: string, port: number): net.Server {
    const server = net.createServer(onConnection)

    server.listen(port, host)

    return server
}
