import { beforeEach, describe, it, expect, vi } from 'vitest';

const { mockLeague, mockTeam, mockContent } = vi.hoisted(() => ({
    mockLeague: { findMany: vi.fn() },
    mockTeam: { findMany: vi.fn() },
    mockContent: { findMany: vi.fn() },
}));

// The sitemap now enumerates published association surfaces. Default to none so
// the existing static-page assertions stay about the static pages.
vi.mock('@/lib/db/prisma', () => ({
    prisma: {
        league: mockLeague,
        team: mockTeam,
        publicContentItem: mockContent,
    },
}));

import sitemap from '@/app/sitemap';

describe('Sitemap Generation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLeague.findMany.mockResolvedValue([]);
        mockTeam.findMany.mockResolvedValue([]);
        mockContent.findMany.mockResolvedValue([]);
    });

    it('should generate a valid sitemap array', async () => {
        const sitemapData = await sitemap();

        expect(Array.isArray(sitemapData)).toBe(true);
        expect(sitemapData.length).toBeGreaterThan(0);
    });

    it('should include homepage with highest priority', async () => {
        const sitemapData = await sitemap();
        const homepage = sitemapData.find((entry) => entry.url === 'https://spartan.arkhins.com');

        expect(homepage).toBeDefined();
        expect(homepage?.priority).toBe(1.0);
        expect(homepage?.changeFrequency).toBe('weekly');
    });

    it('should include all marketing pages', async () => {
        const sitemapData = await sitemap();
        const urls = sitemapData.map((entry) => entry.url);

        expect(urls).toContain('https://spartan.arkhins.com/features');
        expect(urls).toContain('https://spartan.arkhins.com/pricing');
        expect(urls).toContain('https://spartan.arkhins.com/get-started');
        expect(urls).toContain('https://spartan.arkhins.com/contact');
        expect(urls).toContain('https://spartan.arkhins.com/about');
    });

    it('should include documentation pages', async () => {
        const sitemapData = await sitemap();
        const urls = sitemapData.map((entry) => entry.url);

        expect(urls).toContain('https://spartan.arkhins.com/docs');
        expect(urls).toContain('https://spartan.arkhins.com/docs/user-guide');
        expect(urls).toContain('https://spartan.arkhins.com/docs/guides');
        expect(urls).toContain('https://spartan.arkhins.com/docs/api');
        expect(urls).toContain('https://spartan.arkhins.com/docs/contributing');
    });

    it('should include legal pages with lower priority', async () => {
        const sitemapData = await sitemap();
        const privacyPage = sitemapData.find((entry) => entry.url === 'https://spartan.arkhins.com/privacy');
        const termsPage = sitemapData.find((entry) => entry.url === 'https://spartan.arkhins.com/terms');

        expect(privacyPage).toBeDefined();
        expect(termsPage).toBeDefined();
        expect(privacyPage?.priority).toBe(0.3);
        expect(termsPage?.priority).toBe(0.3);
    });

    it('should set appropriate priorities for different page types', async () => {
        const sitemapData = await sitemap();
        const homepage = sitemapData.find((entry) => entry.url === 'https://spartan.arkhins.com');
        const featuresPage = sitemapData.find((entry) => entry.url === 'https://spartan.arkhins.com/features');
        const legalPage = sitemapData.find((entry) => entry.url === 'https://spartan.arkhins.com/privacy');

        expect(homepage?.priority).toBeGreaterThan(featuresPage?.priority || 0);
        expect(featuresPage?.priority).toBeGreaterThan(legalPage?.priority || 0);
    });

    it('should set appropriate change frequencies', async () => {
        const sitemapData = await sitemap();
        const homepage = sitemapData.find((entry) => entry.url === 'https://spartan.arkhins.com');
        const legalPage = sitemapData.find((entry) => entry.url === 'https://spartan.arkhins.com/privacy');

        expect(homepage?.changeFrequency).toBe('weekly');
        expect(legalPage?.changeFrequency).toBe('yearly');
    });

    it('should include lastModified dates for all entries', async () => {
        const sitemapData = await sitemap();

        sitemapData.forEach((entry) => {
            expect(entry.lastModified).toBeInstanceOf(Date);
        });
    });

    it('should use correct base URL', async () => {
        const sitemapData = await sitemap();

        sitemapData.forEach((entry) => {
            expect(entry.url).toMatch(/^https:\/\/spartan\.arkhins\.com/);
        });
    });

    it('should have valid priority values between 0 and 1', async () => {
        const sitemapData = await sitemap();

        sitemapData.forEach((entry) => {
            expect(entry.priority).toBeGreaterThanOrEqual(0);
            expect(entry.priority).toBeLessThanOrEqual(1);
        });
    });

    it('should have valid changeFrequency values', async () => {
        const sitemapData = await sitemap();
        const validFrequencies = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];

        sitemapData.forEach((entry) => {
            expect(validFrequencies).toContain(entry.changeFrequency);
        });
    });

    it('uses one global URL budget for association, team, and news pages', async () => {
        const publishedAt = new Date('2026-08-01T00:00:00Z');
        mockLeague.findMany.mockResolvedValue([
            { slug: 'metro', publishedAt },
        ]);
        mockTeam.findMany.mockResolvedValue([
            {
                slug: 'blades',
                publishedAt,
                league: { slug: 'metro', publishedAt },
            },
        ]);
        mockContent.findMany.mockResolvedValue([
            {
                slug: 'season-opens',
                publishAt: publishedAt,
                league: { slug: 'metro', publishedAt },
            },
        ]);

        const sitemapData = await sitemap();
        const urls = sitemapData.map((entry) => entry.url);

        expect(urls).toEqual(expect.arrayContaining([
            'https://spartan.arkhins.com/associations/metro/news',
            'https://spartan.arkhins.com/associations/metro/teams/blades',
            'https://spartan.arkhins.com/associations/metro/news/season-opens',
        ]));
        expect(sitemapData.length).toBeLessThanOrEqual(10_000);
        expect(mockLeague.findMany.mock.calls[0][0].select.teams).toBeUndefined();
        expect(mockLeague.findMany.mock.calls[0][0].select.publicContentItems).toBeUndefined();

        const teamBudget = mockTeam.findMany.mock.calls[0][0].take;
        const contentBudget = mockContent.findMany.mock.calls[0][0].take;
        expect(teamBudget + contentBudget + 5).toBeLessThanOrEqual(9_984);
    });
});
