import { createFlow } from "@builderbot/bot";
import dotenv from 'dotenv';
dotenv.config();

import {
    init,
    userRegistered,
    userRegistered_repeat,
    start,
    start_repeat,
    e3,
    name,
    i1,
    k1_raza,
    k1_edad,
    k1_peso,
    k1_consideraciones,
    k1_register,
    l1,
    m1,
    m2,
    o1,
    o2,
    q1,
    q1_hora,
    s1,
    u1,
    c2,
    end
} from "./mainFlow";

export default createFlow([
    init,
    userRegistered,
    userRegistered_repeat,
    start,
    start_repeat,
    e3,
    name,
    i1,
    k1_raza,
    k1_edad,
    k1_peso,
    k1_consideraciones,
    k1_register,
    l1,
    m1,
    m2,
    o1,
    o2,
    q1,
    q1_hora,
    s1,
    u1,
    c2,
    end
]);
