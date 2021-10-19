#!/bin/bash
ETF_SHARE_CODE=`ls -at /ql/log/xumf_faker2_jd_get_share_code/* | head -n 1`
if [ ! $ETF_SHARE_CODE ]; then
echo "没有互助码文件" 
else 
echo "开始执行互助码拷贝${ETF_SHARE_CODE}到/ql/code/share_code.log"
echo "------------------------"
cat $ETF_SHARE_CODE
echo "------------------------"
cp -rf $ETF_SHARE_CODE /ql/code/share_code.log
echo "结束互助码拷贝"
fi