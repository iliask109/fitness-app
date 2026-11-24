import { describe, expect, it } from 'vitest';
import { isPushEndpoint } from '../api/_shared';

describe('push endpoints', () => {
  it('accepts the browsers\' push services only', () => {
    expect(isPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(isPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true);
    expect(isPushEndpoint('https://web.push.apple.com/QL1')).toBe(true);
    expect(isPushEndpoint('https://db5p.notify.windows.com/w/?token=1')).toBe(true);
    expect(isPushEndpoint('http://fcm.googleapis.com/x')).toBe(false);
    expect(isPushEndpoint('https://evil.example.com/fcm.googleapis.com')).toBe(false);
    expect(isPushEndpoint('https://fcm.googleapis.com.evil.com/x')).toBe(false);
    expect(isPushEndpoint('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isPushEndpoint('not a url')).toBe(false);
  });
});
