#!/bin/bash
# Chunked, resumable renders: each chunk is its own mp4 (marker .ok when complete); finished chunks are skipped.
cd /home/user/remotion-demo
export REMOTION_TMP=/home/user/remotion-tmp TMPDIR=/home/user/remotion-tmp
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
render() { # comp total dir audio out
  local comp=$1 total=$2 dir=$3 audio=$4 out=$5 step=300
  mkdir -p $dir; : > $dir/list.txt
  for ((a=0; a<total; a+=step)); do
    local b=$((a+step-1)); [ $b -ge $total ] && b=$((total-1))
    local c=$dir/c_$(printf %05d $a).mp4
    echo "file '$(basename $c)'" >> $dir/list.txt
    [ -f $c.ok ] && continue
    npx remotion render src/index.ts $comp $c --frames=$a-$b --concurrency=4 --gl=swangle --browser-executable=$B --codec h264 --crf 16 --timeout=300000 --log=verbose > $dir/log_$a.txt 2>&1 || { echo FAIL > $dir/status; exit 1; }
    touch $c.ok; echo "$b/$total" > $dir/progress
  done
  ffmpeg -loglevel error -y -f concat -safe 0 -i $dir/list.txt -c copy $dir/video.mp4 \
   && ffmpeg -loglevel error -y -i $dir/video.mp4 -i $audio -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart $out \
   && echo DONE > $dir/status || { echo FAIL > $dir/status; exit 1; }
}
render GimliShort 2090 out/chunks_gimli /home/user/gimli-short/audio/mix.wav /home/user/gimli-short/the_jet_that_ran_out_of_fuel_v2.mp4
render ScorchieShort 2017 out/chunks_scorchie /home/user/scorchie-short/audio/mix2.wav /home/user/scorchie-short/the_skyscraper_that_cooked_a_car_v4.mp4
