import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalNumber = (max: number) =>
  z.union([z.coerce.number().min(0).max(max), z.literal(""), z.null()]).optional();

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export const ownerSchema = z.object({
  setupSecret: z.string().min(1).max(256),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});

export const enquirySchema = z.object({
  listingId: z.string().cuid().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: optionalText(32),
  message: z.string().trim().min(10).max(4000),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});

export const listingSchema = z.object({
  title: z.string().trim().min(4).max(160),
  slug: z.string().trim().min(3).max(90).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(30).max(10000),
  purpose: z.enum(["RENT", "SALE"]),
  propertyType: z.string().trim().min(2).max(60),
  price: z.coerce.number().positive().max(100_000_000),
  paymentPeriod: z.string().trim().min(2).max(24),
  address: z.string().trim().min(3).max(240),
  neighbourhood: optionalText(100),
  city: z.string().trim().min(2).max(100),
  region: z.string().trim().min(2).max(100),
  postalCode: optionalText(20),
  country: z.string().trim().min(2).max(100),
  latitude: optionalNumber(90),
  longitude: optionalNumber(180),
  bedrooms: z.coerce.number().int().min(0).max(30),
  bathrooms: z.coerce.number().min(0).max(30),
  floorArea: optionalNumber(1_000_000),
  areaUnit: z.string().trim().min(1).max(20),
  furnished: z.enum(["FURNISHED", "UNFURNISHED", "PARTIALLY_FURNISHED"]),
  amenities: z.array(z.string().trim().min(1).max(60)).max(40),
  utilities: z.array(z.string().trim().min(1).max(60)).max(40),
  availabilityDate: z.string().date().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "AVAILABLE", "COMING_SOON", "RENTED_SOLD", "ARCHIVED"]),
  featured: z.boolean().default(false),
  ownerName: optionalText(100),
  ownerEmail: z.string().email().max(254).optional().or(z.literal("")),
  ownerPhone: optionalText(32),
  displayOwnerContact: z.boolean().default(false),
  viewingInstructions: optionalText(2000),
  seoTitle: optionalText(160),
  seoDescription: optionalText(320),
  assignedToId: optionalText(100),
  photos: z.array(
    z.object({
      url: z.string().url().max(2048).refine((value) => value.startsWith("https://"), "Image URLs must use HTTPS."),
      caption: optionalText(200),
      altText: z.string().trim().min(3).max(250),
      position: z.coerce.number().int().min(0).max(30),
      cover: z.boolean(),
    }),
  ).max(30),
}).superRefine((data, ctx) => {
  if ((data.latitude === "" || data.latitude == null) !== (data.longitude === "" || data.longitude == null)) {
    ctx.addIssue({ code: "custom", path: ["latitude"], message: "Enter both map coordinates or leave both blank." });
  }
  if (data.photos.length > 0 && data.photos.filter((photo) => photo.cover).length !== 1) {
    ctx.addIssue({ code: "custom", path: ["photos"], message: "Select exactly one cover photo." });
  }
});

export const settingsSchema = z.object({
  brand: z.object({
    name: z.string().trim().min(2).max(100),
    tagline: z.string().trim().max(180),
    logoUrl: z.string().max(2048).refine((value) => !value || value.startsWith("https://"), "Use an HTTPS URL."),
    faviconUrl: z.string().max(2048).refine((value) => !value || value.startsWith("https://"), "Use an HTTPS URL."),
    primaryColor: z.string().regex(/^#[\da-fA-F]{6}$/),
    accentColor: z.string().regex(/^#[\da-fA-F]{6}$/),
    contactEmail: z.string().email().max(254).or(z.literal("")),
    contactPhone: z.string().max(32),
    address: z.string().max(300),
    socialLinks: z.object({
      instagram: z.string().url().max(300).or(z.literal("")),
      facebook: z.string().url().max(300).or(z.literal("")),
      linkedin: z.string().url().max(300).or(z.literal("")),
    }),
    footerText: z.string().trim().max(300),
    typography: z.enum(["serif", "sans"]),
    navigation: z.array(z.object({
      label: z.string().trim().min(1).max(40),
      href: z.string().regex(/^\/[a-z0-9?=/_-]*$/i).max(160),
    })).max(8),
    footerLinks: z.array(z.object({
      label: z.string().trim().min(1).max(40),
      href: z.string().regex(/^\/[a-z0-9?=/_-]*$/i).max(160),
    })).max(12),
  }),
  business: z.object({
    country: z.string().trim().min(2).max(100),
    currency: z.string().regex(/^[A-Z]{3}$/),
    priceFormat: z.enum(["whole", "precise"]),
    paymentPeriod: z.enum(["month", "week", "year", "one-time"]),
    areaUnit: z.enum(["sq ft", "sq m"]),
    dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
    purposes: z.array(z.enum(["RENT", "SALE"])).min(1).max(2),
    contactPreference: z.enum(["email", "phone", "either"]),
    showOwnerContact: z.boolean(),
  }),
  home: z.object({
    eyebrow: z.string().trim().max(80),
    headline: z.string().trim().min(4).max(120),
    description: z.string().trim().max(500),
    heroImage: z.string().url().max(2048).refine((value) => value.startsWith("https://"), "Use an HTTPS URL."),
    aboutTitle: z.string().trim().max(120),
    aboutBody: z.string().trim().max(1000),
  }),
  seo: z.object({
    title: z.string().trim().max(160),
    description: z.string().trim().max(320),
    socialImage: z.string().max(2048).refine((value) => !value || value.startsWith("https://"), "Use an HTTPS URL."),
  }),
});

export const enquiryUpdateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "VIEWING", "CLOSED", "SPAM"]).optional(),
  notes: z.string().trim().max(4000).optional(),
  assignedToId: z.string().cuid().nullable().optional(),
});
