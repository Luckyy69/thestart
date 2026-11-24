#!/bin/bash
cd /home/user/remotion-demo
until [ -f out/scorchie/v2.done ]; do sleep 20; done
export REMOTION_TMP=/home/user/remotion-tmp TMPDIR=/home/user/remotion-tmp
npx remotion render src/index.ts GimliShort out/gimli_video.mp4 --concurrency=4 --gl=swangle --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell --codec h264 --crf 16 --timeout=300000 --log=verbose > out/rendergimli.log 2>&1 \
 && ffmpeg -loglevel error -y -i out/gimli_video.mp4 -i /home/user/gimli-short/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart /home/user/gimli-short/the_jet_that_ran_out_of_fuel.mp4 \
 && echo DONE > out/gimli.done || echo FAIL > out/gimli.done
