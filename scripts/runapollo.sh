#!/bin/bash
cd /home/user/remotion-demo
export REMOTION_TMP=/home/user/remotion-tmp TMPDIR=/home/user/remotion-tmp
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
dir=out/chunks_apollo; total=1865; step=300; mkdir -p $dir; : > $dir/list.txt
for ((a=0; a<total; a+=step)); do
  b=$((a+step-1)); [ $b -ge $total ] && b=$((total-1))
  c=$dir/c_$(printf %05d $a).mp4; echo "file '$(basename $c)'" >> $dir/list.txt
  [ -f $c.ok ] && continue
  npx remotion render src/index.ts ApolloShort $c --frames=$a-$b --concurrency=4 --gl=swangle --browser-executable=$B --codec h264 --crf 16 --timeout=300000 --log=verbose > $dir/log_$a.txt 2>&1 || { echo FAIL > $dir/status; exit 1; }
  touch $c.ok
done
ffmpeg -loglevel error -y -f concat -safe 0 -i $dir/list.txt -c copy $dir/video.mp4 \
 && ffmpeg -loglevel error -y -i $dir/video.mp4 -i /home/user/apollo-short/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart /home/user/apollo-short/the_rocket_that_made_its_own_lightning.mp4 \
 && echo DONE > $dir/status || echo FAIL > $dir/status
