'use client';

import { useState, useRef, useEffect } from 'react';
import {
    ChevronDown,
    Globe,
} from 'lucide-react';
import Image from 'next/image';
import { useUserState } from '@/contexts/UserContext';
import { useLocale, type Locale } from '@/contexts/LocaleContext';

const LANGS: { key: Locale; short: string; label: string }[] = [
    { key: 'kk', short: 'Қаз', label: 'Қазақша' },
    { key: 'ru', short: 'Рус', label: 'Русский' },
    { key: 'en', short: 'Eng', label: 'English' },
];

export default function Navbar() {
    const [isLangOpen, setIsLangOpen] = useState(false);
    const langRef = useRef<HTMLDivElement>(null);
    const { user } = useUserState();
    const { locale, setLocale, t } = useLocale();

    const currentLang = LANGS.find(l => l.key === locale) ?? LANGS[0];

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(e.target as Node)) {
                setIsLangOpen(false);
            }
        };
        if (isLangOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isLangOpen]);

    return (
        <nav className="flex bg-inherit p-10 gap-8 pb-6 sm:flex-row flex-col">
            <div className="hidden flex-3/4 px-4 sm:px-6 pr-0 sm:pr-0 min-[576px]:flex justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[rgba(0,0,0,0.31)]">
                        {t('dashboard.welcome')}, {user?.first_name}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {/* Language Selector */}
                    <div className="relative" ref={langRef}>
                        <button
                            type="button"
                            onClick={() => setIsLangOpen(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                        >
                            <Globe className="w-4 h-4 text-gray-400" />
                            <span>{currentLang.short}</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${isLangOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isLangOpen && (
                            <div className="absolute right-0 mt-1.5 w-36 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                                {LANGS.map(lang => (
                                    <button
                                        key={lang.key}
                                        type="button"
                                        onClick={() => { setLocale(lang.key); setIsLangOpen(false); }}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                                            locale === lang.key
                                                ? 'bg-violet-50 text-violet-700 font-semibold'
                                                : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span>{lang.label}</span>
                                        {locale === lang.key && (
                                            <span className="w-2 h-2 rounded-full bg-violet-600 flex-shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* <div
                        className="bg-white rounded-2xl px-4 py-2 h-[60px] cursor-pointer xs:block hidden"
                        onClick={() =>
                            modalController.open('kundelik-integration')
                        }
                    >
                        <Image
                            src="/kundelik.png"
                            alt="kundelik.kz logo"
                            width={100}
                            height={50}
                            className="w-full"
                        />
                    </div> */}
                </div>
            </div>
            {user && user.role == 'student' && (
                <div className="hidden min-[576px]:flex w-fit bg-white h-[60px] rounded-2xl py-2 px-4 gap-6 items-center">
                    {user?.student_data?.classrooms?.[0] && (
                        <p className="bg-[rgba(105,76,253,0.1)] px-6 py-2 rounded-xl text-[rgba(105,76,253,1)] font-bold text-md whitespace-nowrap">
                            {`${user?.student_data?.classrooms[0].grade}${user?.student_data?.classrooms[0].letter}`}{' '}
                            {t('navbar.classShort')}
                        </p>
                    )}
                </div>
            )}
            <div className="flex min-[576px]:hidden justify-center items-center">
                <Image
                    src="/Logo.svg"
                    alt="logo"
                    width={160}
                    height={160}
                    className="w-full"
                />
            </div>
        </nav>
    );
}
