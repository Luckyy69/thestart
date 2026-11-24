#!/bin/bash
cd /home/user/remotion-demo
export REMOTION_TMP=/home/user/remotion-tmp TMPDIR=/home/user/remotion-tmp
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
npx remotion render src/index.ts GimliShort out/gimli_video.mp4 --concurrency=4 --gl=swangle --browser-executable=$B --codec h264 --crf 16 --timeout=300000 --log=verbose > out/rendergimli.log 2>&1 \
 && ffmpeg -loglevel error -y -i out/gimli_video.mp4 -i /home/user/gimli-short/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart /home/user/gimli-short/the_jet_that_ran_out_of_fuel.mp4 \
 && echo DONE > out/gimli.done || echo FAIL > out/gimli.done
npx remotion render src/index.ts ScorchieShort out/scorchie/video_v3.mp4 --concurrency=4 --gl=swangle --browser-executable=$B --codec h264 --crf 16 --timeout=300000 --log=verbose > out/scorchie/renderv3.log 2>&1 \
 && ffmpeg -loglevel error -y -i out/scorchie/video_v3.mp4 -i /home/user/scorchie-short/audio/mix2.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart /home/user/scorchie-short/the_skyscraper_that_cooked_a_car_v3.mp4 \
 && echo DONE > out/scorchie/v3.done || echo FAIL > out/scorchie/v3.done
