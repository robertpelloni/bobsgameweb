import re

def update_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Need to add getFFTData if not present
    if "getFFTData(" not in content:
        fft_function = '''
  public getFFTData(): Uint8Array {
    if (!this.analyzer) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
    this.analyzer.getByteFrequencyData(dataArray);
    return dataArray;
  }
'''
        # Insert before the end of the class
        content = re.sub(r'\}\s*$', fft_function + '\n}', content)

        # Check if analyzer is properly initialized, and if it's connected
        if "this.analyzer = Howler.ctx.createAnalyser();" not in content:
            # Try to inject inside constructor or init
            pass

    with open(filepath, 'w') as f:
        f.write(content)

update_file('src/renderer/audio/AudioManager.ts')
