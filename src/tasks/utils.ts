import { ApiTaskRequest, ApiTaskResponse } from "@watchedcom/schema";
import { EventEmitter } from "events";
import { RequestHandler } from "express";
import * as uuid4 from "uuid/v4";

import { BasicCache } from "../cache";

type TransportFn = (statusCode: number, body: any) => Promise<any>;

export class Responder {
    queue: string[];
    emitter: EventEmitter;
    transport: TransportFn;

    constructor(fn: TransportFn) {
        this.queue = [];
        this.emitter = new EventEmitter();
        this.setTransport(fn);
    }

    async send(statusCode: number, body: any, queueTimeout = 30 * 1000) {
        const id = uuid4();
        this.queue.push(id);
        if (this.queue[0] !== id) {
            console.debug(
                `Queue length ${this.queue.length}, waiting for my turn`
            );
            await new Promise((resolve, reject) => {
                const on = () => {
                    if (this.queue[0] === id) {
                        console.debug("Now it's my turn");
                        this.emitter.removeListener("event", on);
                        resolve();
                    }
                };
                this.emitter.addListener("event", on);
                setTimeout(() => {
                    this.emitter.removeListener("event", on);
                    const i = this.queue.indexOf(id);
                    if (i !== -1) this.queue.splice(i, 1);
                    reject("Waiting for slot timed out");
                }, queueTimeout);
            });
        }
        let res;
        try {
            res = await this.transport(statusCode, body);
        } finally {
            if (this.queue[0] !== id) {
                throw new Error(`First queue element is not the current id`);
            }
            this.queue.shift();
        }
        return res;
    }

    setTransport(fn: TransportFn) {
        this.transport = fn;
        this.emitter.emit("event");
    }
}

export const sendTask = async (
    responder: Responder,
    cache: BasicCache,
    task: ApiTaskRequest,
    timeout = 30 * 1000
): Promise<ApiTaskResponse> => {
    // getServerValidators().task.request(task);
    console.debug(`Task ${task.id} is starting`);
    await cache.set(`task.wait:${task.id}`, "1", timeout * 2);
    await responder.send(200, task);

    // Wait for the response
    const data: any = await cache.waitKey(
        `task.response:${task.id}`,
        timeout,
        true
    );
    const { responseChannel, response } = JSON.parse(data);
    // getServerValidators().task.response(response);
    console.debug(`Task ${task.id} resolved`);

    // Set new valid responder
    responder.setTransport(async (statusCode, body) => {
        const data = JSON.stringify({ statusCode, body });
        await cache.set(`task.response:${responseChannel}`, data, timeout);
    });

    // Return response
    return response;
};

export const createTaskResponseHandler = (
    cache: BasicCache,
    timeout = 120 * 1000
) => {
    const taskHandler: RequestHandler = async (req, res) => {
        const response: ApiTaskResponse = req.body;
        // getServerValidators().task.response(response);
        console.debug(`Task ${response.id} received response from client`);

        // Make sure the key exists to prevent spamming
        if (!(await cache.get(`task.wait:${response.id}`))) {
            throw new Error(`Task wait key ${response.id} does not exist`);
        }
        await cache.delete(`task.wait:${response.id}`);

        // Set the response
        const responseChannel = uuid4();
        const raw = JSON.stringify({ responseChannel, response });
        await cache.set(`task.response:${response.id}`, raw);

        // Wait for the response
        const data = await cache.waitKey(
            `task.response:${responseChannel}`,
            timeout,
            true
        );
        const { statusCode, body } = JSON.parse(data);
        res.status(statusCode).send(body);
        console.debug(`Task ${response.id} sending next response to client`);
    };

    return taskHandler;
};
