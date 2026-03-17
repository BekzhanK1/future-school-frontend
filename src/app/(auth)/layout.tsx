import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
    title: 'Вход - Future School',
    description: 'Страница авторизации Future School',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex">
            {/* Left panel — branding */}
            <div
                className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col items-center justify-center relative overflow-hidden"
                style={{
                    background: 'url(/future-school-login-bg.jpg) center/cover no-repeat',
                }}
            >
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-900/80 via-purple-800/70 to-indigo-900/80" />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-lg">
                    <Image
                        src="/Logo.svg"
                        alt="Future School Logo"
                        width={220}
                        height={60}
                        className="h-14 w-auto mb-8 brightness-0 invert"
                    />
                    <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
                        Образование нового поколения
                    </h1>
                    <p className="text-purple-200 text-base xl:text-lg leading-relaxed">
                        Управляйте расписанием, оценками и учебным процессом в едином цифровом пространстве.
                    </p>

                    {/* Feature pills */}
                    <div className="mt-10 flex flex-wrap gap-2 justify-center">
                        {['Электронный журнал', 'Расписание', 'КТП', 'Уведомления'].map(f => (
                            <span
                                key={f}
                                className="px-3 py-1.5 bg-white/15 text-white text-sm rounded-full backdrop-blur-sm border border-white/20"
                            >
                                {f}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Bottom gradient fade */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-violet-900/40 to-transparent" />
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-white min-h-screen">
                {/* Mobile logo */}
                <div className="lg:hidden mb-8">
                    <Image
                        src="/Logo.svg"
                        alt="Future School Logo"
                        width={180}
                        height={48}
                        className="h-10 w-auto"
                    />
                </div>

                <div className="w-full max-w-[400px]">
                    {children}
                </div>

                <p className="mt-8 text-xs text-gray-400">
                    © {new Date().getFullYear()} Future School. Все права защищены.
                </p>
            </div>
        </div>
    );
}
