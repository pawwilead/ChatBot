import { createFlow } from "@builderbot/bot";
import {
    mainFlow,
    askIfRegistered,
    askIfRegistered_repeat,
    writeCC,
    writeCCNew,
    writeCCNewCheck,
    mainFlow_repeat
} from "./mainFlow";

export default createFlow([
    mainFlow,
    askIfRegistered,
    askIfRegistered_repeat,
    writeCC,
    writeCCNew,
    writeCCNewCheck,
    mainFlow_repeat
]);
