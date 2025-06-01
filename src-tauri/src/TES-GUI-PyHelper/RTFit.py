import sys
import json
import numpy as np
import math
from scipy.optimize import curve_fit
import scipy.optimize as opt

def fit_func(para,x,y):                  #fit関数の定義。paraはパラメタ列。
	RN = para[0]                         #パラメタ列の1番目は常伝導抵抗値(mohm)
	Tc = para[1]                         #パラメタ列の2番目は相転移温度(mK)
	T1 = para[2]                         #パラメタ列の3番目はT1(mK)
	T2 = para[3]                         #パラメタ列の4番目はT2(mK)
	
	RN_func = ((y[-1]-y[0])/math.pi)*math.atan(RN)+(y[0]+y[-1])/2
	Tc_func = ((x[-1]-x[0])/math.pi)*math.atan(Tc)+(x[-1]+x[0])/2
	T1_func = ((x[-1])/math.pi)*math.atan(T1)+(x[-1])/2
	T2_func = ((x[-1])/math.pi)*math.atan(T2)+(x[-1])/2

	residual = y - (RN_func/((1+np.exp(-(x-Tc_func)/T1_func))*(1+np.exp(-(x-Tc_func)/T2_func))))
	return(residual)

def RTFit_main(json_data):
    # JSONデータの解析
    #json_data = json.loads(json_data)
    T = np.array(json_data["T"])
    R = np.array(json_data["R"])
    initial_param = np.array([0.1, 0.1, 0.1, 0.1])

    result = opt.leastsq(fit_func,initial_param,args = (T,R),)
    return result[0]

# 入力例（実際にはjsonデータとして渡される）
if __name__ == "__main__":
    # 例としての入力データ
    json_data = json.dumps({
        "T": [180,1.820000000000000000e+02,1.840000000000000000e+02,1.860000000000000000e+02,1.880000000000000000e+02,1.900000000000000000e+02,1.920000000000000000e+02,1.940000000000000000e+02,1.960000000000000000e+02,1.980000000000000000e+02,2.000000000000000000e+02,2.020000000000000000e+02,2.040000000000000000e+02,2.060000000000000000e+02,2.080000000000000000e+02,2.100000000000000000e+02,2.120000000000000000e+02,2.140000000000000000e+02,2.160000000000000000e+02,2.180000000000000000e+02,2.200000000000000000e+02],  # 入力データx
        "R": [0.0000000000000008659739592076221,0.0017132715543688225,0.001832828181545487,0.0009161036121696498,0.0016284035570447886,0.0020879017293867763,0.0006916917139351941,0.001030876886859211,0.002142874027716979,0.0025787003496386515,1.3392155901236185,9.419976193619489,13.508680461315537,14.518098021959373,14.814278786162943,14.881264150559337,14.967414134643963,14.964572351202655,14.966625118057081,15.047604743781495,15.086540527893792],  # 対応するy
        "initial_param": [0.1, 0.1, 0.1, 0.1]  # 初期パラメータ(R, Tc, T1, T2)
    })

    json_data=json.loads(json_data)

    print(RTFit_main(json_data))
    #print("Optimized parameters:", optimized_param)
