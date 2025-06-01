from flask import Flask, request, jsonify
from Bessel import bessel_main
from RTFit import RTFit_main

app = Flask(__name__)

@app.route('/Bessel', methods=['POST'])
def run_bessel():
    data = request.json
    rate = data.get('rate')
    fs = data.get('fs')
    b, a = bessel_main(rate, fs)
    return jsonify({'b': b.tolist(), 'a': a.tolist()})

@app.route('/RTFit', methods=['POST'])
def run_pulse():
    data = request.json
    result = RTFit_main(data)  # 任意のシミュレーション関数
    return jsonify(result)
