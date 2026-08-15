// src/app/developer/page.tsx
'use client';

import Link from 'next/link';

// Component to render a code block with explanations
const CodeBlock = ({ title, code, explanations }: { title: string, code: string, explanations: { line: string, explanation: string }[] }) => {
    return (
        <div className="mb-12">
            <h2 className="text-3xl font-bold text-emerald-400 mb-6 border-b-2 border-gray-700 pb-2">{title}</h2>
            <div className="bg-gray-900/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-700/50 overflow-hidden">
                <div className="p-4 bg-gray-800/50 border-b border-gray-700/50">
                    <p className="text-sm font-mono text-gray-400">{title}</p>
                </div>
                <div className="prose prose-invert max-w-none">
                    <pre className="bg-transparent p-0 m-0 rounded-none"><code className="language-typescript">{code}</code></pre>
                </div>
            </div>
            <div className="mt-6 space-y-4">
                <h3 className="text-xl font-semibold text-white">الشرح التفصيلي سطر بسطر:</h3>
                {explanations.map((item, index) => (
                    <div key={index} className="bg-gray-800/60 p-4 rounded-lg border border-gray-700/60">
                        <p className="font-mono text-sm text-cyan-400 bg-gray-900 p-2 rounded-md mb-2">{`سطر ${item.line}`}</p>
                        <p className="text-gray-300">{item.explanation}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};


export default function DeveloperPage() {
    const queueModuleCode = `import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MessagesProcessor } from './messages.processor';
import { BaileysModule } from '../baileys/baileys.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'whatsapp-messages',
            defaultJobOptions: {
                removeOnComplete: true,
                removeOnFail: false,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
            },
        }),
        BaileysModule,
    ],
    providers: [MessagesProcessor],
    exports: [BullModule],
})
export class QueueModule { }`;

    const queueModuleExplanations = [
        { line: '1', explanation: 'بنجيب حاجة اسمها `Module` من مكتبة `nestjs/common`. دي الأساس اللي بنبني بيه أي جزء في مشروع NestJS.' },
        { line: '2', explanation: 'هنا بنستورد `BullModule` من مكتبة `nestjs/bullmq`. دي المكتبة اللي بتخلينا نعمل نظام الطوابير (Queues) ونتعامل معاها.' },
        { line: '3', explanation: 'بنجيب `MessagesProcessor`، وده "العامل" اللي هينفذ الشغل اللي في الطابور. هنشوف تفاصيله كمان شوية.' },
        { line: '4', explanation: 'بنجيب `BaileysModule`، ودي الوحدة المسؤولة عن التعامل مع واتساب (Baileys API).' },
        { line: '6', explanation: '`@Module` ده ديكوريتور (Decorator) بيقول لـ NestJS إن الكلاس ده عبارة عن "وحدة" أو "Module"، يعني جزء متكامل له وظيفة معينة.' },
        { line: '7', explanation: '`imports`: هنا بنقول لوحدتنا (QueueModule) إيه الوحدات التانية اللي هي محتاجة تستخدمها.' },
        { line: '8', explanation: '`BullModule.registerQueue({...})`: هنا بنعمل الإعدادات الأساسية للطابور بتاعنا.' },
        { line: '9', explanation: '`name: \'whatsapp-messages\'`: بندي للطابور بتاعنا اسم مميز، وهو "whatsapp-messages". بالاسم ده بنقدر نكلم الطابور ده من أي حتة في المشروع.' },
        { line: '10', explanation: '`defaultJobOptions`: دي الإعدادات الافتراضية لأي "شغلانة" (Job) تتحط في الطابور ده.' },
        { line: '11', explanation: '`removeOnComplete: true`: معناها إن أي شغلانة تخلص بنجاح، امسحها من الطابور. ده عشان منستهلكش مساحة في الذاكرة على الفاضي.' },
        { line: '12', explanation: '`removeOnFail: false`: معناها إن أي شغلانة تفشل، **متتمسحش**. دي مهمة جدًا عشان نقدر ندخل ونشوف الشغلانات اللي فشلت ونعرف سبب المشكلة ونصلحها.' },
        { line: '13', explanation: '`attempts: 3`: لو شغلانة فشلت، السيستم هيحاول ينفذها تاني لحد 3 مرات. ده بيدي فرصة للعملية إنها تنجح لو الفشل كان بسبب مشكلة مؤقتة (زي فصلة نت ورجعت).' },
        { line: '14', explanation: '`backoff`: دي إعدادات الوقت اللي السيستم بيستناه بين كل محاولة فاشلة والتانية.' },
        { line: '15', explanation: '`type: \'exponential\'`: معناها إن فترة الانتظار هتزيد بشكل أسي. يعني لو أول مرة استنى 5 ثواني، المرة التانية ممكن يستنى 10، واللي بعدها 20، وهكذا. ده عشان يدي فرصة أكبر للمشكلة المؤقتة إنها تتحل.' },
        { line: '16', explanation: '`delay: 5000`: دي مدة الانتظار المبدئية بالمللي ثانية (5000 يعني 5 ثواني).' },
        { line: '20', explanation: '`BaileysModule`: بنستورد وحدة Baileys عشان "العامل" بتاعنا يقدر يستخدمها ويبعت رسايل واتساب.' },
        { line: '22', explanation: '`providers`: هنا بنعرف "العمال" أو "الخدمات" (Services) اللي الوحدة دي بتقدمها. في حالتنا، العامل هو `MessagesProcessor`.' },
        { line: '23', explanation: '`exports`: هنا بنقول إيه الحاجات اللي الوحدة دي بتسمح للوحدات التانية إنها تستخدمها. إحنا بنعمل `export` للـ`BullModule` عشان باقي أجزاء المشروع تقدر تحط شغل في الطابور بتاعنا.' },
        { line: '25', explanation: '`export class QueueModule { }`: ده الكلاس بتاع الوحدة نفسها اللي بيجمع كل الإعدادات دي مع بعض.' },
    ];

    const messagesProcessorCode = `import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaileysService } from '../baileys/baileys.service';
import { PrismaService } from '../prisma/prisma.service';

export interface SendMessageJob {
    sessionId: string;
    messageLogId: string;
    to: string;
    message: string;
}

@Processor('whatsapp-messages', {
    concurrency: 1,
    limiter: {
        max: 5,
        duration: 60000,
    },
})
export class MessagesProcessor extends WorkerHost {
    private readonly logger = new Logger(MessagesProcessor.name);

    constructor(
        private readonly baileysService: BaileysService,
        private readonly prisma: PrismaService,
    ) {
        super();
    }

    async process(job: Job<SendMessageJob>): Promise<{ success: boolean; error?: string }> {
        const { sessionId, messageLogId, to, message } = job.data;

        this.logger.log(\`Processing message job \${job.id} for session \${sessionId}\`);

        try {
            await this.prisma.messageLog.update({
                where: { id: messageLogId },
                data: { status: 'SENDING' },
            });

            const isSessionConnected = this.baileysService.isConnected(sessionId);
            if (!isSessionConnected) {
                throw new Error(\`WhatsApp session is not connected. Session: \${sessionId}\`);
            }

            const isWarmup = this.baileysService.isInWarmup(sessionId);
            const minDelay = isWarmup ? 2000 : 1000;
            const maxDelay = isWarmup ? 5000 : 3000;
            const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;

            await this.sleep(randomDelay);

            const result = await this.baileysService.sendMessage(sessionId, to, message);

            if (result.success) {
                await this.prisma.messageLog.update({
                    where: { id: messageLogId },
                    data: { status: 'SENT', sentAt: new Date() },
                });
                return { success: true };
            } else {
                throw new Error(result.error || 'Unknown error sending message');
            }
        } catch (error) {
            const errorMessage = (error as Error).message;
            await this.prisma.messageLog.update({
                where: { id: messageLogId },
                data: { status: 'FAILED' },
            });
            return { success: false, error: errorMessage };
        }
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job<SendMessageJob>) {
        this.logger.log(\`Job \${job.id} completed\`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<SendMessageJob>, error: Error) {
        this.logger.error(\`Job \${job.id} failed: \${error.message}\`);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}`;

    const messagesProcessorExplanations = [
        { line: '1-5', explanation: 'بنستورد المكتبات والأدوات اللي هنحتاجها. أهمهم `Processor` اللي بيعرف الكلاس ده كـ"عامل"، و`Job` اللي بتمثل "الشغلانة" نفسها.' },
        { line: '7-12', explanation: '`export interface SendMessageJob`: هنا بنعرف شكل البيانات اللي أي شغلانة لازم تكون عليها. لازم تحتوي على `sessionId`, `messageLogId`, `to`, `message`.' },
        { line: '14', explanation: '`@Processor(\'whatsapp-messages\')`: أهم ديكوريتور. ده اللي بيربط العامل ده بالطابور اللي اسمه `whatsapp-messages`. أي شغلانة تتحط في الطابور ده، العامل ده هو اللي هيستلمها.' },
        { line: '15', explanation: '`concurrency: 1`: معناها إن العامل ده هينفذ **شغلانة واحدة بس في المرة**. مش هيعمل كذا حاجة مع بعض. دي حركة أساسية عشان نتجنب الحظر (Anti-Ban).' },
        { line: '16', explanation: '`limiter`: ده "محدد سرعة" عشان منبعتش رسايل كتير في وقت قليل.' },
        { line: '17-18', explanation: '`max: 5, duration: 60000`: بنقوله الحد الأقصى هو 5 شغلانات (رسايل) كل 60000 مللي ثانية (يعني كل دقيقة). ده برضه جزء مهم من استراتيجية الـ Anti-Ban.' },
        { line: '21', explanation: '`export class MessagesProcessor extends WorkerHost`: تعريف الكلاس بتاعنا كـ"عامل" بيرث من `WorkerHost`.' },
        { line: '22', explanation: '`private readonly logger = ...`: بنجهز أداة لتسجيل الملاحظات (Logger) عشان نقدر نتابع إيه اللي بيحصل جوه العامل ده وهو شغال.' },
        { line: '24-29', explanation: '`constructor(...)`: هنا بنعمل حاجة اسمها "Dependency Injection". بنطلب من NestJS يدينا نسخة جاهزة من `BaileysService` (عشان نبعت واتساب) و `PrismaService` (عشان نكلم الداتا بيز).' },
        { line: '31', explanation: '`async process(job: Job<SendMessageJob>)`: دي أهم دالة في الكلاس كله. دي الدالة اللي بتشتغل مع كل شغلانة جديدة تيجي من الطابور.' },
        { line: '32', explanation: '`const { ... } = job.data;`: بنستخلص البيانات بتاعتنا (لمَن، والرسالة، ...) من الشغلانة اللي جاية.' },
        { line: '34', explanation: '`this.logger.log(...)`: بنسجل ملاحظة إننا بدأنا نعالج شغلانة جديدة. ده بيفيدنا في المتابعة.' },
        { line: '36-41', explanation: 'أول خطوة في التنفيذ: بنكلم الداتا بيز (`prisma`) وبنحدّث حالة الرسالة دي لـ `SENDING` عشان نبقى عارفين إننا شغالين عليها دلوقتي.' },
        { line: '43-46', explanation: 'بنتأكد إن حساب الواتساب (`sessionId`) متصل حاليًا باستخدام `baileysService`. لو مش متصل، بنرمي إيرور فورًا ونوقف العملية للشغلانة دي.' },
        { line: '48-51', explanation: 'هنا الجزء بتاع الـ Anti-Ban. بنعمل ديلاي (تأخير) عشوائي. لو الحساب في مرحلة التسخين (`isWarmup`) بيبقى التأخير أطول (2-5 ثواني)، لو حساب عادي بيبقى أقصر (1-3 ثواني).' },
        { line: '53', explanation: '`await this.sleep(randomDelay);`: بنوقف تنفيذ الكود للمدة العشوائية اللي حسبناها. ده بيخلي سلوكنا أشبه بالبشر.' },
        { line: '55', explanation: '`const result = ...`: هنا بنبعت الرسالة فعلًا باستخدام `baileysService`.' },
        { line: '57-62', explanation: '`if (result.success)`: لو الرسالة اتبعتت بنجاح، بنروح نحدّث حالة الرسالة في الداتا بيز لـ `SENT` ونسجل تاريخ الإرسال.' },
        { line: '63-65', explanation: '`else`: لو الإرسال فشل، بنرمي إيرور عشان ندخل في مرحلة معالجة الأخطاء (الـ `catch` بلوك).' },
        { line: '66-74', explanation: '`catch (error)`: لو أي خطأ حصل في الخطوات اللي فاتت، بنمسكه هنا. بنسجل الإيرور، ونحدّث حالة الرسالة في الداتا بيز لـ `FAILED` عشان نبقى عارفين إنها فشلت.' },
        { line: '78-81', explanation: '`@OnWorkerEvent(\'completed\')`: الديكوريتور ده بيخلي الدالة دي تشتغل لما أي شغلانة **تخلص بنجاح**. كل اللي بنعمله إننا بنسجل ملاحظة إنها نجحت.' },
        { line: '83-86', explanation: '`@OnWorkerEvent(\'failed\')`: ده بيشتغل لما أي شغلانة **تفشل** (بعد كل المحاولات). بنسجل ملاحظة بالفشل والسبب بتاعه.' },
        { line: '88-90', explanation: '`private sleep(ms: number)`: دالة مساعدة بسيطة كل وظيفتها إنها بتعمل `setTimeout` عشان توقف الكود للمدة المطلوبة.' }
    ];

    const messagesServiceCode = `import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './messages.dto';
import { SendMessageJob } from '../queue/messages.processor';
import { Instance, User } from '@prisma/client';

@Injectable()
export class MessagesService {
    constructor(
        @InjectQueue('whatsapp-messages') private messageQueue: Queue<SendMessageJob>,
        private readonly prisma: PrismaService,
    ) { }

    async sendMessage(user: User, instance: Instance, dto: SendMessageDto) {
        if (instance.status !== 'CONNECTED') {
            throw new BadRequestException('WhatsApp instance is not connected');
        }

        const messageLog = await this.prisma.messageLog.create({
            data: {
                instanceId: instance.id,
                to: dto.to,
                content: dto.message,
                status: 'QUEUED',
            },
        });

        await this.messageQueue.add(
            'send-whatsapp',
            {
                sessionId: instance.sessionId,
                messageLogId: messageLog.id,
                to: dto.to,
                message: dto.message,
            },
            {
                delay: Math.floor(Math.random() * 1000),
                removeOnComplete: true,
                removeOnFail: false,
            },
        );

        return {
            id: messageLog.id,
            status: 'QUEUED',
            message: 'Message queued for delivery',
        };
    }
}`;
    const messagesServiceExplanations = [
        { line: '1-8', explanation: 'كالعادة، بنستورد الأدوات اللي هنحتاجها. أهمهم `InjectQueue` عشان نجيب الطابور بتاعنا، و`Queue` عشان نعرف نوع المتغير بتاعه.' },
        { line: '10', explanation: '`@Injectable()`: ديكوريتور بيقول إن الكلاس ده عبارة عن "خدمة" (Service) يقدر NestJS يعملها "Injection" في أي مكان تاني.' },
        { line: '12-15', explanation: '`constructor`: هنا بنطلب من NestJS حاجتين: نسخة من الطابور `whatsapp-messages` ونخزنها في `messageQueue`، ونسخة من خدمة `Prisma`.' },
        { line: '17', explanation: '`async sendMessage(...)`: دي الدالة الأساسية اللي بتستقبل طلب إرسال الرسالة من الـ Controller (اللي بيستقبل طلبات الـ API).' },
        { line: '18-20', explanation: 'أول خطوة، بنتأكد إن حساب الواتساب متصل. لو مش `CONNECTED`، بنرمي إيرور ونقول للمستخدم إن مينفعش نبعت رسالة دلوقتي.' },
        { line: '22-30', explanation: 'تاني خطوة، بنسجل الرسالة في الداتا بيز (جدول `messageLog`) وبنديها حالة مبدئية `QUEUED`. ده بيحصل **قبل** ما نحطها في الطابور، عشان نضمن إن كل رسالة اتطلبت تتسجل عندنا.' },
        { line: '32', explanation: '`await this.messageQueue.add(...)`: هنا بقى بنكلم الطابور وبنضيفله شغلانة جديدة.' },
        { line: '33', explanation: '`\'send-whatsapp\'`: بندي اسم للشغلانة دي. ده ممكن يفيدنا في التصنيف بعدين، لكن حاليًا مش بنستخدمه بشكل أساسي.' },
        { line: '34-39', explanation: 'هنا بنحط البيانات الفعلية للشغلانة (الـ `payload`) اللي العامل هيستلمها بعدين.' },
        { line: '40-45', explanation: 'دي إعدادات خاصة بالشغلانة دي بس. هنا مثلاً بنضيف `delay` عشوائي صغير (لحد ثانية) عشان نوزع بداية الشغلانات ومتبدأش كلها في نفس اللحظة.' },
        { line: '47-51', explanation: 'آخر وأهم خطوة. بنرجع رد **فوري** للمستخدم نقوله إن رسالته `QUEUED`. إحنا مش بنستنى الرسالة تتبعت. ده بيدي إحساس بالسرعة في واجهة المستخدم (الـ Frontend).' }
    ];


    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 text-white p-4 sm:p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="text-center my-12">
                    <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300 pb-2">
                        شرح تفصيلي للـ Backend
                    </h1>
                    <p className="text-gray-400 mt-4 text-lg max-w-3xl mx-auto">
                        هنا هتلاقي شرح كامل ومفصل لأهم الأجزاء في الباك إند اللي بتشغل السيستم، خصوصًا نظام الطوابير (Queues) اللي بيبعت الرسايل.
                    </p>
                    <div className="mt-6">
                        <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                            &larr; العودة إلى لوحة التحكم
                        </Link>
                    </div>
                </div>

                <CodeBlock title="backend/src/queue/queue.module.ts" code={queueModuleCode} explanations={queueModuleExplanations} />
                <CodeBlock title="backend/src/messages/messages.service.ts" code={messagesServiceCode} explanations={messagesServiceExplanations} />
                <CodeBlock title="backend/src/queue/messages.processor.ts" code={messagesProcessorCode} explanations={messagesProcessorExplanations} />

            </div>
        </div>
    );
}
