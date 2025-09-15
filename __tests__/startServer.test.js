const fs = require('fs').promises;
const { authenticate } = require('passport');
const { startServer } = require('../app');
const { sequelize, TokenBlacklist } = require('../models');

jest.mock('../models', () => ({
    sequelize: {
        authenticate: jest.fn().mockResolvedValue(),
        sync: jest.fn().mockResolvedValue()
    },
    User: {},
    Contact: {},
    TokenBlacklist: {}
}));

jest.mock('express', () => {
    const actualExpress = jest.requireActual('express');
    const app = actualExpress();
    app.listen = jest.fn((port, cb) => cb && cb());
    const expressMock = () => app;
    Object.assign(expressMock, actualExpress);
    return expressMock;
});


describe("startServer()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("connects to DB, ensures uploads dir exists, and starts server", async () => {
        jest.spyOn(fs, 'access').mockResolvedValue();
        jest.spyOn(fs, 'mkdir').mockResolvedValue();
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        await startServer();

        const { sequelize } = require('../models');
        expect(sequelize.authenticate).toHaveBeenCalled();
        expect(sequelize.sync).toHaveBeenCalledWith({ force: false });
        expect(fs.access).toHaveBeenCalled();

        const express = require('express')();
        expect(express.listen).toHaveBeenCalledWith(3000, expect.any(Function));

        expect(logSpy).toHaveBeenCalledWith("Databse & tables created");
        expect(logSpy).toHaveBeenCalledWith("uploads directory exists.");
        expect(logSpy).toHaveBeenCalledWith("Server running on localhost:3000");

        logSpy.mockRestore();
    });

    test("creates uploads dir if missing", async () => {
        jest.spyOn(fs, 'access').mockRejectedValue(new Error("No such dir"));
        const mkdirSpy = jest.spyOn(fs, 'mkdir').mockResolvedValue();
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        await startServer();

        expect(mkdirSpy).toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith("uploads directory created.");

        logSpy.mockRestore();
    });
});
