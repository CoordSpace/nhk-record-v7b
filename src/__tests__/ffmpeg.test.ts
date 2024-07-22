import { expect, jest, test } from '@jest/globals';
import { execute } from '../utils';
import { postProcessRecording } from '../ffmpeg';

const inputPathNoThumbnail = 'inputPath.mp4';
const inputPathWithThumbnail = 'inputPathWithThumbnail.mp4';

jest.mock('../utils', () => {
    const stdout: Array<string> = [];
    const stderr: Array<string> = [];
    const mockExecute = jest.fn<typeof execute>(async (command, args) => {
        if (command == 'ffprobe') {
            // getStreamCount
            let nbStreams = 2;
            if (args.includes(inputPathWithThumbnail)) {
                nbStreams = 3;
            }
            const mockFfprobeObject = [JSON.stringify({
                format: {
                    nb_streams: nbStreams
                }
            })];
            return Promise.resolve({ stdout: mockFfprobeObject, stderr: [] });
        } else {
            // all ffmpeg calls
            return Promise.resolve({ stdout: stdout, stderr: stderr });
        }
    });

    return {
        __esModule: true,
        default: jest.fn(),
        execute: mockExecute
    }
});

jest.mock('../logger');

beforeEach(() => {
    jest.mocked(execute).mockClear();
});

describe('ffmpeg', () => {
    describe('postProcessRecording', () => {
        it('should run ffmpeg once with the right arguments when no crop and no thumbnail is given', async () => {
            const inputPath = inputPathNoThumbnail;
            const outputPath = 'outputPath.mp4';
            const startMs = 124687;
            const endMs = 367110;
            await postProcessRecording(inputPath, outputPath, startMs, endMs, []);

            expect(execute).toHaveBeenCalledTimes(2);
            expect(execute).toHaveBeenCalledWith(
                'ffmpeg',
                [
                    '-y',
                    '-i', inputPath,
                    '-ss', `${startMs / 1000}`,
                    '-to', `${endMs / 1000}`,
                    '-codec', 'copy',
                    '-map', '0:0',
                    '-map', '0:1',
                    '-map_metadata', '0',
                    '-f', 'mp4',
                    outputPath
                ]
            );
        });

        it('should run ffmpeg once with the right arguments when no crop and embedded thumbnail is given', async () => {
            const inputPath = inputPathWithThumbnail;
            const outputPath = 'outputPath.mp4';
            const startMs = 124687;
            const endMs = 367110;
            await postProcessRecording(inputPath, outputPath, startMs, endMs, []);

            expect(execute).toHaveBeenCalledTimes(2);
            expect(execute).toHaveBeenCalledWith(
                'ffmpeg',
                [
                    '-y',
                    '-i', inputPath,
                    '-i', inputPath,
                    '-ss', `${startMs / 1000}`,
                    '-to', `${endMs / 1000}`,
                    '-codec', 'copy',
                    '-filter_complex', `[1:2]setpts=PTS+${startMs / 1000}/TB[tn]`,
                    '-map', '0:0',
                    '-map', '0:1',
                    '-map', '[tn]',
                    '-codec:v:1', 'mjpeg',
                    '-disposition:v:1', 'attached_pic',
                    '-map_metadata', '0',
                    '-f', 'mp4',
                    outputPath
                ]
            );
        });
    });
});