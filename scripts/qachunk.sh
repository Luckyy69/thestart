#!/bin/bash
# usage: qachunk.sh <start>
a=$1; cd /home/user/remotion-demo
python3 - $a <<'P'
import json,sys
a=int(sys.argv[1]); m=json.load(open('/home/user/emu-short/shots.json'))
sh=[{"id":s["id"],"a":max(0,s["a"]-a),"b":min(200,s["b"]-a)} for s in m["shots"] if s["b"]>a and s["a"]<a+200]
xf=[[x-a,y-a] for x,y in m["xfade"] if y>a and x<a+200]
json.dump({"shots":sh,"xfade":xf},open('/tmp/claude-0/-home-user/685ddfbb-2159-5e2f-98ae-ff5d6166b5c5/scratchpad/sc.json','w'))
P
nice -n 15 python3 scripts/short_qa.py out/chunks_emu/c_$(printf %05d $a).mp4 out/em/qa_$a /tmp/claude-0/-home-user/685ddfbb-2159-5e2f-98ae-ff5d6166b5c5/scratchpad/sc.json 2>&1 | grep -E "FRAMES|POPS"
