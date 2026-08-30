import { Metadata } from 'next';

/**
 * SEO Configuration for Spartan
 * Centralized metadata and structured data for all pages
 */

export const SITE_CONFIG = {
    name: 'Spartan',
    title: 'Spartan - Free Sports Team Management Platform',
    description:
        'Replace chaotic spreadsheets, group chats, and email chains with a single source of truth for sports team management. Free, open-source, and easy to use.',
    url: 'https://spartan.arkhins.com',
    ogImage: '/images/logo.webp',
    // No X/Twitter presence yet — leave unset so the card omits site/creator
    // rather than crediting an account we do not own.
    twitterHandle: undefined as string | undefined,
    keywords: [
        'sports team management',
        'team organization',
        'roster management',
        'scheduling software',
        'free team management',
        'sports scheduling',
        'team calendar',
        'RSVP tracking',
        'open source sports',
    ],
};

/**
 * Generate metadata for a page
 */
export function generatePageMetadata({
    title,
    description,
    path = '',
    keywords = [],
    ogImage,
    noIndex = false,
}: {
    title: string;
    description: string;
    path?: string;
    keywords?: string[];
    ogImage?: string;
    noIndex?: boolean;
}): Metadata {
    const url = `${SITE_CONFIG.url}${path}`;
    const imageUrl = ogImage ? (ogImage.startsWith('http') ? ogImage : `${SITE_CONFIG.url}${ogImage}`) : SITE_CONFIG.ogImage;
    const fullTitle = title.includes('Spartan') ? title : `${title} - Spartan`;
    const allKeywords = [...SITE_CONFIG.keywords, ...keywords];

    return {
        title: fullTitle,
        description,
        keywords: allKeywords.join(', '),
        authors: [{ name: 'Arkhins', url: 'https://arkhins.com' }],
        creator: 'Arkhins',
        publisher: 'Spartan',
        robots: noIndex
            ? {
                index: false,
                follow: false,
            }
            : {
                index: true,
                follow: true,
                googleBot: {
                    index: true,
                    follow: true,
                    'max-video-preview': -1,
                    'max-image-preview': 'large',
                    'max-snippet': -1,
                },
            },
        alternates: {
            canonical: url,
        },
        openGraph: {
            type: 'website',
            url,
            title: fullTitle,
            description,
            siteName: SITE_CONFIG.name,
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: fullTitle,
                },
            ],
            locale: 'en_US',
        },
        twitter: {
            card: 'summary_large_image',
            ...(SITE_CONFIG.twitterHandle
                ? { site: SITE_CONFIG.twitterHandle, creator: SITE_CONFIG.twitterHandle }
                : {}),
            title: fullTitle,
            description,
            images: [imageUrl],
        },
    };
}

/**
 * Organization structured data (JSON-LD)
 */
export function getOrganizationSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_CONFIG.name,
        url: SITE_CONFIG.url,
        logo: `${SITE_CONFIG.url}/images/logo.png`,
        description: SITE_CONFIG.description,
        sameAs: [
            'https://github.com/Arkhins-0/Spartan',
            'https://instagram.com/arkhins',
            'https://linkedin.com/in/krishna-vijay',
            'https://arkhins.com',
        ],
        contactPoint: {
            '@type': 'ContactPoint',
            email: 'tech@ctrsports.in',
            contactType: 'Customer Support',
            availableLanguage: 'English',
        },
    };
}

/**
 * Software Application structured data (JSON-LD)
 */
export function getSoftwareApplicationSchema(): {
    '@context': string;
    '@type': string;
    name: string;
    applicationCategory: string;
    operatingSystem: string;
    offers: {
        '@type': string;
        price: string;
        priceCurrency: string;
        description: string;
    };
    description: string;
    url: string;
    screenshot: string;
    featureList: string;
    aggregateRating?: undefined;
} {
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: SITE_CONFIG.name,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web Browser',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            description: 'Free tier available',
        },
        description: SITE_CONFIG.description,
        url: SITE_CONFIG.url,
        screenshot: `${SITE_CONFIG.url}/images/hero-dashboard-mockup.svg`,
        featureList: 'Roster Management, Event Scheduling, RSVP Tracking, Email Notifications, Mobile-First Design, Team Calendar',
    };
}

/**
 * Breadcrumb structured data (JSON-LD)
 */
export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: `${SITE_CONFIG.url}${item.url}`,
        })),
    };
}

/**
 * FAQ structured data (JSON-LD)
 */
export function getFAQSchema(faqs: Array<{ question: string; answer: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    };
}
