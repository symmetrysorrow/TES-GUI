import scipy.signal as signal

def bessel_main(rate,fs):
    ws = fs / rate * 2
    b, a = signal.bessel(2, ws, "low")
    return b, a