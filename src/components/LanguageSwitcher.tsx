'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { ChangeEvent, useTransition } from 'react';

export default function LanguageSwitcher() {
    const [isPending, startTransition] = useTransition();
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    function onSelectChange(event: ChangeEvent<HTMLSelectElement>) {
        const nextLocale = event.target.value;
        startTransition(() => {
            router.replace(pathname, { locale: nextLocale });
        });
    }

    return (
        <div className="fixed top-4 right-4 z-[100]">
            <select
                value={locale}
                className="bg-slate-800 text-white border border-slate-600 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-lg backdrop-blur-sm bg-opacity-80"
                onChange={onSelectChange}
                disabled={isPending}
            >
                <option value="en">English</option>
                <option value="ml">മലയാളം</option>
            </select>
        </div>
    );
}