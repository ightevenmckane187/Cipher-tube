import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
};

export default function () {
  // Targeting the default server port 3000
  http.get('http://localhost:3000/health');
  sleep(1);
}
