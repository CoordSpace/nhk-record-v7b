import { expect, jest, test } from '@jest/globals';
import { execute } from '../utils';
import { postProcessRecording } from '../ffmpeg';

jest.mock('../utils', () => {
    const stdout: Array<string> = [];
    const stderr: Array<string> = [];
    const mockExecute = jest.fn<typeof execute>(async (command, args) => {
        if (command == 'ffprobe') {
            const mockFfprobeObject = [
                '{',
                '   "format": {',
                '       "filename": "Rockie and Her Friends - 4034 - 001.mp4",',
                '       "nb_streams": 2,',
                '       "nb_programs": 0,',
                '       "format_name": "mov,mp4,m4a,3gp,3g2,mj2",',
                '       "format_long_name": "QuickTime / MOV",',
                '       "start_time": "0.017000",',
                '       "duration": "618.709333",',
                '       "size": "383262174",',
                '       "bit_rate": "4955634",',
                '       "probe_score": 100,',
                '       "tags": {',
                '           "major_brand": "isom",',
                '           "minor_version": "512",',
                '           "compatible_brands": "isomiso2avc1mp41",',
                '           "date": "2024-04-06T03:40:00.000Z",',
                '           "encoder": "Lavf58.50.100",',
                '           "description": "Puppet action show for children. In a distant post-human future where surviving creatures have formed a community, new-breed dinosaur girl Rockie sets out on hilarious adventures with her schoolmates.",',
                '           "show": "Rockie and Her Friends",',
                '           "episode_id": "001",',
                '           "network": "NHK World"',
                '       }',
                '   }',
                '}'
            ];
            return Promise.resolve({ stdout: mockFfprobeObject, stderr: [] });
        } else {
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

describe('ffmpeg', () => {
    describe('postProcessRecording', () => {
        it('should run ffmpeg once with the right arguments when no crop and no thumbnail is given', async () => {
            const inputPath = 'inputPath.mp4';
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
                    '-ss', '' + startMs / 1000,
                    '-to', '' + endMs / 1000,
                    '-codec', 'copy',
                    '-map', '0:0',
                    '-map', '0:1',
                    '-map_metadata', '0',
                    '-f', 'mp4',
                    outputPath
                ]
            );
        });
    });
});