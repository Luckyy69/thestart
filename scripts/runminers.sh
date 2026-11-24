#!/bin/bash
cd /home/user/remotion-demo
export REMOTION_TMP=/home/user/remotion-tmp TMPDIR=/home/user/remotion-tmp
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
dir=out/chunks_miners; total=2060; step=200; mkdir -p $dir; : > $dir/list.txt
for ((a=0; a<total; a+=step)); do
  b=$((a+step-1)); [ $b -ge $total ] && b=$((total-1))
  c=$dir/c_$(printf %05d $a).mp4; echo "file '$(basename $c)'" >> $dir/list.txt
  [ -f $c.ok ] && continue
  npx remotion render src/index.ts MinersShort $c --frames=$a-$b --scale=1.3333333333333333 --concurrency=4 --gl=swangle --browser-executable=$B --codec h264 --crf 16 --timeout=300000 --log=verbose > $dir/log_$a.txt 2>&1 || { echo FAIL > $dir/status; exit 1; }
  touch $c.ok
done
ffmpeg -loglevel error -y -f concat -safe 0 -i $dir/list.txt -c copy $dir/video.mp4 \
 && ffmpeg -loglevel error -y -i $dir/video.mp4 -i /home/user/miners-short/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart /home/user/miners-short/the_note_on_the_drill_2k_raw.mp4 \
 && echo DONE > $dir/status || echo FAIL > $dir/status
