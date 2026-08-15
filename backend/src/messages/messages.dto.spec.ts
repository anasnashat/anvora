import { validate } from 'class-validator';
import { SendMessageDto } from './messages.dto';

it('accepts a UUID instance ID and validates media type separately', async () => {
  const dto = Object.assign(new SendMessageDto(), {
    to: '15551234567',
    message: 'hi',
    instanceId: '550e8400-e29b-41d4-a716-446655440000',
    mediaType: 'IMAGE',
  });

  expect(await validate(dto)).toHaveLength(0);
});
