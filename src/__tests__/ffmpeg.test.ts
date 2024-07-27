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
            // return 2 streams unless the input filename is "inputPathWithThumbnail.mp4"
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
        it('should run ffmpeg once with the right arguments when smart cut is off, no crop is requested, and no thumbnail is given', async () => {
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

        it('should run ffmpeg once with the right arguments when smart cut is off, no crop is requested, and embedded thumbnail is given', async () => {
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
                    '-map', '[tn]', '-codec:v:1', 'mjpeg', '-disposition:v:1', 'attached_pic',
                    '-map_metadata', '0',
                    '-f', 'mp4',
                    outputPath
                ]
            );
        });

        it('should run ffmpeg once with the right arguments when smart cut is off, a constant crop to remove breaking news chryon is requested, and embedded thumbnail is given', async () => {
            const inputPath = inputPathWithThumbnail;
            const outputPath = 'outputPath.mp4';
            const startMs = 124687;
            const endMs = 367110;
            const cropParameters = [
                {
                    time: 0,
                    width: 1_728
                },
            ]
            await postProcessRecording(inputPath, outputPath, startMs, endMs, cropParameters);

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
                    '-filter_complex', `nullsrc=size=1920x1080:r=29.97[base];[base][0:0]overlay='-96':0:shortest=1[o];[o]scale='2134':-1:eval=frame:flags=bicubic[s];[s]crop=1920:1080:0:0[c];[1:2]setpts=PTS+${startMs / 1000}/TB[tn]`,
                    '-map', '[c]', '-crf', '19', '-preset', 'veryfast', '-codec:v:0', 'libx264',
                    '-map', '0:1',
                    '-map', '[tn]', '-codec:v:1', 'mjpeg', '-disposition:v:1', 'attached_pic',
                    '-map_metadata', '0',
                    '-f', 'mp4',
                    outputPath
                ]
            );
        });

        it('should run ffmpeg once with the right arguments when smart cut is off, a crop to remove breaking news chryon during part of the stream is requested, and embedded thumbnail is given', async () => {
            const inputPath = inputPathWithThumbnail;
            const outputPath = 'outputPath.mp4';
            const startMs = 124687;
            const endMs = 367110;
            const cropParameters = [
                {
                    time: 156800,
                    width: 1_728
                },
                {
                    time: 260000,
                    width: 1_920
                }
            ]
            await postProcessRecording(inputPath, outputPath, startMs, endMs, cropParameters);

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
                    '-filter_complex', `nullsrc=size=1920x1080:r=29.97[base];[base][0:0]overlay='if(gte(t,260),0,if(gte(t,156.8),-96,0))':0:shortest=1[o];[o]scale='if(gte(t,260),1920,if(gte(t,156.8),2134,1920))':-1:eval=frame:flags=bicubic[s];[s]crop=1920:1080:0:0[c];[1:2]setpts=PTS+${startMs / 1000}/TB[tn]`,
                    '-map', '[c]', '-crf', '19', '-preset', 'veryfast', '-codec:v:0', 'libx264',
                    '-map', '0:1',
                    '-map', '[tn]', '-codec:v:1', 'mjpeg', '-disposition:v:1', 'attached_pic',
                    '-map_metadata', '0',
                    '-f', 'mp4',
                    outputPath
                ]
            );
        });
    });
});