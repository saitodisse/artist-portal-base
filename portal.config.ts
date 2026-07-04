export type PortalConfig = {
  sourceId: string;
  name: string;
  publicName: string;
  description: string;
  siteUrl: string;
  basePath: string;
  repositoryUrl: string;
  links: Array<{ label: string; url: string }>;
  theme: {
    accent: string;
    background: string;
    foreground: string;
  };
  publication: {
    schemaVersion: string;
    license: string;
    contentLicense: string;
  };
};

const portalConfig = {
  sourceId: "demo-artist-portal",
  name: "Demo Artist Portal",
  publicName: "Demo Artist Portal",
  description: "A fictional achorde-compatible artist portal used as a starting point.",
  siteUrl: "https://saitodisse.github.io",
  basePath: "/artist-portal-base",
  repositoryUrl: "https://github.com/saitodisse/artist-portal-base",
  links: [
    { label: "Repository", url: "https://github.com/saitodisse/artist-portal-base" },
    { label: "Import catalog", url: "source-catalog/" },
  ],
  theme: {
    accent: "#d14b2f",
    background: "#f8f7f3",
    foreground: "#1e1d1a",
  },
  publication: {
    schemaVersion: "1.0.0",
    license: "MIT",
    contentLicense: "CC0-1.0",
  },
} satisfies PortalConfig;

export default portalConfig;
