import { expect, jest, test } from '@jest/globals';
import { execute } from '../utils';
import { getKeyframeBoundaries, postProcessRecording } from '../ffmpeg';
import { Readable } from 'stream';

const inputPathNoThumbnail = 'inputPath.mp4';
const inputPathWithThumbnail = 'inputPathWithThumbnail.mp4';

jest.mock('../utils', () => {
    const stdout: Array<string> = [];
    const stderr: Array<string> = [];
    const mockExecute = jest.fn<typeof execute>(async (command, args) => {
        if (command == 'ffprobe') {
            if (args.includes('frame=pts_time')) {
                // getKeyframeBoundaries
                const mockFfprobeOutput = [JSON.stringify({
                    "frames": [
                        {
                            "pts_time": "140.140000",
                            "side_data_list": [
                                {

                                }
                            ]
                        },
                        {
                            "pts_time": "142.142000",
                            "side_data_list": [
                                {

                                }
                            ]
                        },
                        {
                            "pts_time": "144.144000",
                            "side_data_list": [
                                {

                                }
                            ]
                        },
                        {
                            "pts_time": "146.146000",
                            "side_data_list": [
                                {

                                }
                            ]
                        },
                        {
                            "pts_time": "148.148000",
                            "side_data_list": [
                                {

                                }
                            ]
                        },
                        {
                            "pts_time": "738.738000",
                            "side_data_list": [
                                {

                                }
                            ]
                        },
                        {
                            "pts_time": "740.740000",
                            "side_data_list": [
                                {

                                }
                            ]
                        },
                        {
                            "pts_time": "742.742000",
                            "side_data_list": [
                                {

                                }
                            ]
                        },
                        {
                            "pts_time": "744.744000",
                            "side_data_list": [
                                {

                                }
                            ]
                        },
                        {
                            "pts_time": "746.746000",
                            "side_data_list": [
                                {

                                }
                            ]
                        }
                    ]
                })];
                return Promise.resolve({ stdout: mockFfprobeOutput, stderr: stderr });
            } else if (args.includes('stream=bit_rate')) {
                // getBitrate
                const mockFfprobeOutput = [JSON.stringify({
                    "programs": [

                    ],
                    "streams": [
                        {
                            "bit_rate": "4590588"
                        }
                    ]
                })];
                return Promise.resolve({ stdout: mockFfprobeOutput, stderr: [] });
            } else if (args.includes('-show_format')) {
                // getStreamCount
                // return 2 streams unless the input filename is "inputPathWithThumbnail.mp4"
                let nbStreams = 2;
                if (args.includes(inputPathWithThumbnail)) {
                    nbStreams = 3;
                }
                const mockFfprobeOutput = [JSON.stringify({
                    format: {
                        nb_streams: nbStreams
                    }
                })];
                return Promise.resolve({ stdout: mockFfprobeOutput, stderr: [] });
            } else {
                return Promise.resolve({ stdout: stdout, stderr: stderr });
            }
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
    describe('getKeyframeBoundaries', () => {
        it('should find the first keyframe after the start timeindex and the last keyframe before the end timeindex', async () => {
            const keyframes = await getKeyframeBoundaries(inputPathWithThumbnail, 144311, 744077);
            expect(keyframes[0]).toBe(146146);
            expect(keyframes[1]).toBe(742742);
        });
    });

    describe('postProcessRecording', () => {
        it('should run ffmpeg once with the right arguments when smart cut is off, no crop is requested, and no thumbnail is given', async () => {
            const inputPath = inputPathNoThumbnail;
            const outputPath = 'outputPath.mp4';
            const startMs = 124687;
            const endMs = 367110;
            const smartTrim = false;
            await postProcessRecording(inputPath, outputPath, startMs, endMs, smartTrim, []);

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
            const smartTrim = false;
            await postProcessRecording(inputPath, outputPath, startMs, endMs, smartTrim, []);

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
            ];
            const smartTrim = false;
            await postProcessRecording(inputPath, outputPath, startMs, endMs, smartTrim, cropParameters);

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
            ];
            const smartTrim = false;
            await postProcessRecording(inputPath, outputPath, startMs, endMs, smartTrim, cropParameters);

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

        // @TODO: are the assertions too brittle? how much do we actually care about the order of calls?
        it('should run ffmpeg once with the right arguments when smart cut is on, no crop is requested, and embedded thumbnail is given', async () => {
            const inputPath = inputPathWithThumbnail;
            const outputPath = 'outputPath.mp4';
            const startMs = 144311;
            const endMs = 744077;
            const expectedStartKeyframeMs = 146146;
            const expectedEndKeyframeMs = 742742;
            const smartTrim = true;
            await postProcessRecording(inputPath, outputPath, startMs, endMs, smartTrim, []);

            expect(execute).toHaveBeenCalledTimes(8);
            expect(execute).toHaveBeenNthCalledWith(
                1,
                'ffprobe',
                [
                    '-v', 'quiet',
                    '-print_format', 'json',
                    '-show_format',
                    inputPath
                ]
            );
            expect(execute).toHaveBeenNthCalledWith(
                2,
                'ffprobe',
                [
                    '-v', 'quiet',
                    '-select_streams', 'v:0',
                    '-skip_frame', 'nokey',
                    '-show_entries', 'frame=pts_time',
                    '-read_intervals', `${(startMs - 5000) / 1000}%+10,${(endMs - 5000) / 1000}%+10`,
                    '-print_format', 'json',
                    inputPath
                ]
            );
            expect(execute).toHaveBeenNthCalledWith(
                3,
                'ffprobe',
                [
                    '-v', 'quiet',
                    '-select_streams', 'v:0',
                    '-show_entries', 'stream=bit_rate',
                    '-print_format', 'json',
                    inputPath
                ]
            );
            expect(execute).toHaveBeenNthCalledWith(
                4,
                'ffmpeg',
                [
                    '-ss', `${expectedStartKeyframeMs / 1000}`,
                    '-i', inputPath,
                    '-ss', '0',
                    '-t', `${(expectedEndKeyframeMs - expectedStartKeyframeMs) / 1000}`,
                    '-map', '0:0', '-c:0', 'copy',
                    '-map', '0:1', '-c:1', 'copy',
                    '-video_track_timescale', '90000',
                    '-ignore_unknown',
                    '-f', 'mp4',
                    `${inputPath}.smarttrim.mid`
                ]
            );
            expect(execute).toHaveBeenNthCalledWith(
                5,
                'ffmpeg',
                [
                    '-ss', `${startMs / 1000}`,
                    '-i', inputPath,
                    '-ss', '0',
                    '-t', `${(expectedStartKeyframeMs - startMs) / 1000}`,
                    '-map', '0:0', '-c:0', 'libx264', '-b:0', '4590588',
                    '-map', '0:1', '-c:1', 'copy',
                    '-video_track_timescale', '90000',
                    '-ignore_unknown',
                    '-f', 'mp4',
                    `${inputPath}.smarttrim.start`
                ]
            );
            expect(execute).toHaveBeenNthCalledWith(
                6,
                'ffmpeg',
                [
                    '-ss', `${expectedEndKeyframeMs / 1000}`,
                    '-i', inputPath,
                    '-ss', '0',
                    '-t', `${(endMs - expectedEndKeyframeMs) / 1000}`,
                    '-map', '0:0', '-c:0', 'libx264', '-b:0', '4590588',
                    '-map', '0:1', '-c:1', 'copy',
                    '-video_track_timescale', '90000',
                    '-ignore_unknown',
                    '-f', 'mp4',
                    `${inputPath}.smarttrim.end`
                ]
            );
            expect(execute).toHaveBeenCalledWith(
                'ffmpeg',
                [
                    '-hide_banner',
                    '-f', 'concat',
                    '-safe', '0',
                    '-protocol_whitelist', 'pipe,file,fd',
                    '-i', '-',
                    '-map', '0:0', '-c:0', 'copy', '-disposition:0', 'default',
                    '-map', '0:1', '-c:1', 'copy', '-disposition:1', 'default',
                    '-movflags', '+faststart',
                    '-default_mode', 'infer_no_subs',
                    '-video_track_timescale', '90000',
                    '-ignore_unknown',
                    '-f', 'mp4',
                    `${outputPath}.smarttrim.FINAL.mp4`
                ],
                expect.any(Readable)
            );
            expect(execute).toHaveBeenLastCalledWith(
                'ffmpeg',
                [
                    '-i', inputPath,
                    '-i', `${outputPath}.smarttrim.FINAL.mp4`,
                    '-map', '0:2', '-c', 'copy',
                    '-map', '1', '-c', 'copy',
                    '-map_metadata', '0',
                    '-f', 'mp4',
                    outputPath
                ]
            );
        });
    });
});