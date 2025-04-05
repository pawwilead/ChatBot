import { createFlow } from "@builderbot/bot";
import {
    start,
    start_repeat,
    b1,
    b1_repeat,
    c1,
    c2,
    e1,
    e2,
    e3,
} from "./mainFlow";

export default createFlow([
    start,
    start_repeat,
    b1,
    b1_repeat,
    c1,
    c2,
    e1,
    e2,
    e3,
]);
