import axios from 'axios';

export interface SpeedTestResult {
  download: number;
  upload: number;
  latency: number;
  time: string;
}

export const runSpeedTest = async (): Promise<SpeedTestResult> => {
  try {
    const response = await axios.get('http://192.168.1.2/cgi-bin/speed_test.cgi');
    console.log('Speed Test Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Speed Test Error:', error);
    throw error;
  }
};