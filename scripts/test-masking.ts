import assert from 'node:assert';
import {
  maskUsername,
  maskEmail,
  maskPhone,
  maskAddress,
  maskGeneric,
  maskField,
  canViewUnmasked,
  shouldMask,
} from '../lib/masking.ts';

function runTests() {
  console.log('Testing Personal Information Masking System...');

  // 1. Username masking: J*****n
  assert.strictEqual(maskUsername('Justin'), 'J*****n', 'Username Justin should mask to J*****n');
  assert.strictEqual(maskUsername('JohnDoe'), 'J*****e', 'Username JohnDoe should mask to J*****e');
  assert.strictEqual(maskUsername('@Justin'), '@J*****n', 'Handle @Justin should mask to @J*****n');
  assert.strictEqual(maskUsername(''), '', 'Empty username returns empty string');
  assert.strictEqual(maskUsername(null), '', 'Null username returns empty string');
  assert.strictEqual(maskUsername(undefined), '', 'Undefined username returns empty string');
  assert.strictEqual(maskUsername('J'), '*', 'Single char username masks to *');
  assert.strictEqual(maskUsername('Jo'), 'J*', 'Two char username masks to J*');
  assert.strictEqual(maskUsername('Jon'), 'J*****n', 'Three char username masks to J*****n');
  console.log('PASS: maskUsername rules');

  // 2. Email masking: jo*****@gmail.com
  assert.strictEqual(
    maskEmail('john.doe@gmail.com'),
    'jo*****@gmail.com',
    'john.doe@gmail.com should mask to jo*****@gmail.com'
  );
  assert.strictEqual(
    maskEmail('john@gmail.com'),
    'jo*****@gmail.com',
    'john@gmail.com should mask to jo*****@gmail.com'
  );
  assert.strictEqual(
    maskEmail('jo@gmail.com'),
    'jo*****@gmail.com',
    'jo@gmail.com should mask to jo*****@gmail.com'
  );
  assert.strictEqual(
    maskEmail('j@gmail.com'),
    '*@gmail.com',
    'j@gmail.com should mask to *@gmail.com'
  );
  assert.strictEqual(maskEmail(''), '', 'Empty email returns empty string');
  assert.strictEqual(maskEmail(null), '', 'Null email returns empty string');
  assert.strictEqual(
    maskEmail('no-domain'),
    'n****',
    'Email with no domain falls back to generic mask'
  );
  console.log('PASS: maskEmail rules');

  // 3. Phone masking: 09******80
  assert.strictEqual(
    maskPhone('09123456780'),
    '09******80',
    '09123456780 should mask to 09******80'
  );
  assert.strictEqual(
    maskPhone('0912-345-6780'),
    '09******80',
    'Formatted phone 0912-345-6780 should mask to 09******80'
  );
  assert.strictEqual(
    maskPhone('+63 912 345 6780'),
    '09******80',
    '+63 912 345 6780 should mask to 09******80'
  );
  assert.strictEqual(
    maskPhone('+639123456780'),
    '09******80',
    '+639123456780 should mask to 09******80'
  );
  assert.strictEqual(maskPhone('1234'), '****', 'Short 4-digit phone masks all digits');
  assert.strictEqual(maskPhone(''), '', 'Empty phone returns empty string');
  assert.strictEqual(maskPhone(null), '', 'Null phone returns empty string');
  console.log('PASS: maskPhone rules');

  // 4. Address masking: Protected placeholder
  assert.strictEqual(
    maskAddress('123 Sampaguita St, Graceville, SJDM'),
    '•••••••••••• (Protected)',
    'Address masks to protected placeholder'
  );
  assert.strictEqual(
    maskAddress('123 Sampaguita St', 'Protected Address'),
    'Protected Address',
    'Custom placeholder is respected'
  );
  assert.strictEqual(maskAddress(''), '', 'Empty address returns empty string');
  assert.strictEqual(maskAddress(null), '', 'Null address returns empty string');
  console.log('PASS: maskAddress rules');

  // 5. Generic masking
  assert.strictEqual(maskGeneric('SECRET123'), 'S****', 'SECRET123 masks to S****');
  assert.strictEqual(maskGeneric('A'), '*', 'Single character masks to *');
  assert.strictEqual(maskGeneric(''), '', 'Empty string returns empty string');
  console.log('PASS: maskGeneric rules');

  // 6. maskField helper
  assert.strictEqual(maskField('Justin', 'username'), 'J*****n');
  assert.strictEqual(maskField('john@gmail.com', 'email'), 'jo*****@gmail.com');
  assert.strictEqual(maskField('09123456780', 'phone'), '09******80');
  assert.strictEqual(maskField('123 Street', 'address'), '•••••••••••• (Protected)');
  console.log('PASS: maskField helper');

  // 7. Authorization checks
  const userA = 'user-uuid-1';
  const userB = 'user-uuid-2';

  // Owner viewing own data
  assert.strictEqual(canViewUnmasked(userA, userA, false), true, 'Owner can view unmasked');
  assert.strictEqual(shouldMask(userA, userA, false), false, 'Owner should not be forced to mask');

  // Stranger viewing userA
  assert.strictEqual(canViewUnmasked(userA, userB, false), false, 'Stranger cannot view unmasked');
  assert.strictEqual(shouldMask(userA, userB, false), true, 'Stranger must be masked');

  // Admin viewing userA
  assert.strictEqual(canViewUnmasked(userA, userB, true), true, 'Admin can view unmasked');
  assert.strictEqual(shouldMask(userA, userB, true), false, 'Admin is not forced to mask');

  // Unauthenticated visitor
  assert.strictEqual(canViewUnmasked(userA, null, false), false, 'Unauthenticated cannot view unmasked');
  assert.strictEqual(shouldMask(userA, null, false), true, 'Unauthenticated must be masked');

  console.log('PASS: authorization checks');
  console.log('\nAll 7 test suites passed successfully!');
}

runTests();
