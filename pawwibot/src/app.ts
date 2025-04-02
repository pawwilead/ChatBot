import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { MetaProvider as Provider } from '@builderbot/provider-meta'
import template from './template'
import { provider } from './provider'

const PORT = process.env.PORT ?? 3008



const main = async () => {
    const { handleCtx, httpServer } = await createBot({
        flow: template,
        provider: provider,
        database: new Database(),
    })

    httpServer(+PORT)
}

main()
