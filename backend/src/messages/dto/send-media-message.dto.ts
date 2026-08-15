export class SendMediaMessageDto {
  to: string;
  content: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';
  mediaUrl?: string;
  instanceId?: string;
}
