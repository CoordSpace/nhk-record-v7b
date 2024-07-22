import { expect, jest, test } from '@jest/globals';
import { execute } from '../utils';
import logger from '../logger';
import { getFfmpegPostProcessArguments, postProcessRecording } from '../ffmpeg';

jest.mock('../utils', () => {
    const stdout: Array<string> = [];
    const stderr: Array<string> = [];
    const mockExecute = jest.fn<typeof execute>((command, args) => new Promise((resolve, reject) => ({ stdout: stdout, stderr: stderr })));

    return {
        __esModule: true,
        default: jest.fn(),
        execute: mockExecute
    }
});

jest.mock('../logger');

describe('ffmpeg', () => {
    describe('getFfmpegPostProcessArguments', () => {
        it('should return the right ffmpeg parameters when no crop and no thumbnail is given', async () => {
            const startMs = 124687;
            const endMs = 367110;
            const args = getFfmpegPostProcessArguments('inputPath.mp4', 'outputPath.mp4', startMs, endMs, [], false);
            const argString = args.join(' ');
            expect(argString).toMatch('-i inputPath.mp4');
            expect(argString).toMatch(`-ss ${startMs / 1000}`);
            expect(argString).toMatch(`-to ${endMs / 1000}`);
            expect(argString).toMatch('-codec copy');
            expect(argString).toMatch('-map 0:0');
            expect(argString).toMatch('-map 0:1');
            expect(argString).toMatch('-map_metadata 0');
            expect(argString).toMatch('-f mp4');
            expect(args[args.length - 1]).toEqual('outputPath.mp4');
        });
    });

    describe('postProcessRecording', () => {
        it('should run ffmpeg once with the right arguments when no crop and no thumbnail is given', async () => {
            const startMs = 124687;
            const endMs = 367110;
            postProcessRecording('inputPath.mp4', 'outputPath.mp4', startMs, endMs, []);
            expect(execute).toHaveBeenCalledTimes(1);
        });
    });
});