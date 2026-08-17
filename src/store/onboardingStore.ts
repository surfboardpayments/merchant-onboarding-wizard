import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { FIRST_STEP, LAST_STEP } from '@/lib/constants/wizardSteps';

// ---------------------------------------------------------------------------
// Inline types (mirrors Zod schemas but all fields optional for progressive
// filling during the wizard flow). This wizard COLLECTS merchant onboarding
// data; the completed application is submitted to the acquirer (Acquirer)
// via API, which performs the actual onboarding, ID checks and KYC downstream.
// ---------------------------------------------------------------------------

export interface Address {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
}

export interface CreditCheck {
  status?: 'pending' | 'completed' | 'failed' | 'skipped';
  creditScore?: number;
  creditRating?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'very_high';
  provider?: string;
  checkedAt?: string;
}

export type EntityType = 'limited_company' | 'sole_trader' | 'partnership';

export interface CompanyInfo {
  entityType?: EntityType;
  companyNumber?: string;       // Companies House number (ltd) or UTR (sole trader)
  companyName?: string;         // Legal name (ltd) or trading name (sole trader)
  companyStatus?:
    | 'active'
    | 'dissolved'
    | 'liquidation'
    | 'receivership'
    | 'administration'
    | 'voluntary-arrangement'
    | 'converted-closed'
    | 'insolvency-proceedings';
  registeredAddress?: Address;
  sicCodes?: string[];
  dateOfCreation?: string;
  companyType?: string;
  jurisdiction?: string;
  creditCheck?: CreditCheck;
  // Sole trader specific
  utrNumber?: string;
  tradingName?: string;
  // Tax / registration
  vatNumber?: string;           // Legal/registered VAT/Tax ID
  charityNumber?: string;       // Registered charity number, where applicable
  ownershipEntityType?:
    | 'limited_company'
    | 'llp'
    | 'limited_partnership'
    | 'partnership'
    | 'sole_trader'
    | 'charity'
    | 'cic'
    | 'club_society_association'
    | 'government_entity'
    | 'mutual_or_friendly_society'
    | 'trust'
    | 'unincorporated';
}

export interface OpeningHoursEntry {
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface InStoreDetails {
  numberOfLocations?: number;
  openingHours?: Record<string, OpeningHoursEntry>;
  isSeasonal?: boolean;
  seasonalMonths?: number[];
  terminalsPerLocation?: number;
}

export interface BusinessDetails {
  merchantDba?: string;
  dbaAddress?: Address;
  dbaAddressSameAsRegistered?: boolean;
  companyUrl?: string;
  salesUrl?: string;
  businessType?: 'online_only' | 'in_store_only' | 'both';
  productsDescription?: string;
  mcc?: string;
  inStoreDetails?: InStoreDetails;
  expectedMonthlyVolume?: 'under_10k' | '10k_50k' | '50k_100k' | '100k_plus';
  averageTransactionValue?: 'under_25' | '25_50' | '50_100' | '100_250' | '250_plus';
  tradingHistory?: 'already_trading' | 'new_business';
  monthlyVolumeLast3Months?: string;
  // Turnover figures (GBP)
  annualTurnover?: number;        // total business turnover (cash + cards)
  annualCardTurnover?: number;    // combined annual card sales
  estAvgTicket?: number;          // estimated average transaction value
}

export interface OutletSalesSplit {
  ftf: number;      // face-to-face %
  internet: number; // e-commerce %
  moto: number;     // mail/telephone order %
}

export interface OutletDeliverySplit {
  d0: number;       // same-day %
  d1to7: number;
  d8to14: number;
  d15to30: number;
  dOver30: number;
}

export interface DateOfBirth {
  day?: number;
  month?: number;
  year?: number;
}

export interface Invite {
  email?: string;
  token?: string;
  sentAt?: string;
  expiresAt?: string;
  remindersSent?: number;
  completedAt?: string;
}

export interface Screening {
  status?: 'not_started' | 'in_progress' | 'clear' | 'flagged' | 'failed';
  checkedAt?: string;
}

export interface Person {
  id: string;
  source?: 'companies_house' | 'manual';
  isSelf?: boolean;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  title?: string;
  dateOfBirth?: DateOfBirth;
  residentialAddress?: Address;
  nationality?: string;
  phoneNumber?: string;
  email?: string;
  role?: 'director' | 'psc' | 'ubo' | 'director_and_psc' | 'sole_trader';
  naturesOfControl?: string[];
  invite?: Invite;
  pepScreening?: Screening;
  sanctionsScreening?: Screening;
  signatoryType?: 'SINGLE_SIGNATORY' | 'CO_SIGNATORY' | 'NONE';
  ownershipPercentage?: number;  // 0–100
  previousAddress?: Address;     // if current address < 3 years
  addressFrom?: string;          // YYYY-MM-DD
  addressTo?: string;            // YYYY-MM-DD
}

export interface CorporateShareholder {
  id: string;
  legalName?: string;
  registrationNumber?: string;
  countryOfRegistration?: string;
  ownershipPercentage?: number;  // must be ≥25 to warrant entry
  // Corporate entities are tagged SHAREHOLDER; UBO is reserved for natural persons.
  types?: Array<'SHAREHOLDER'>;
  // Owner-company contact, captured when a corporate entity holds ≥25%.
  // Falls back to the registered address of the merchant if unknown.
  contactAddress?: Address;
  contactEmail?: string;
  contactPhone?: string;
  // If this corporate is itself owned by another, capture the ultimate parent's
  // legalName so we have the full ownership chain for AML.
  ultimateParentLegalName?: string;
}

export interface TransactionDetails {
  transactionDescriptor?: string;
  refundPolicy?: 'full_refund' | 'partial_refund' | 'no_refunds' | 'custom';
  refundPolicyCustom?: string;
  tradingHistory?: 'already_trading' | 'new_business';
  monthlyVolumeLast3Months?: string;
  projectedMonthlyVolume?: string;
  pepSanctionsConsent?: boolean;
}

export interface Settlement {
  nameOnAccount?: string;
  sortCode?: string;
  accountNumber?: string;
  bankName?: string;
  bankAccountValidated?: boolean;
  iban?: string;
  bic?: string;              // SWIFT/BIC
  bankCity?: string;
  bankCountryCode?: string;  // numeric ISO, default 826
  currency?: string;         // default GBP
  accountType?: string;
  daysCredit?: number;
  daysDebit?: number;
  bankAccountType?: 'BUSINESS' | 'PERSONAL';
  billingLevel?: 'outlet' | 'business';
}

export interface Consent {
  termsAccepted?: boolean;
  privacyPolicyAccepted?: boolean;
  submittedAt?: string;
}

// ---------------------------------------------------------------------------
// Store state & actions
// ---------------------------------------------------------------------------

export interface OnboardingState {
  // Application identity
  id: string;
  currentStep: number;

  // Contact
  contactEmail: string;
  contactPhone: string;

  // Section data (all partial for progressive filling)
  company: Partial<CompanyInfo>;
  business: Partial<BusinessDetails>;
  people: Person[];
  corporateShareholders: CorporateShareholder[];
  transactions: Partial<TransactionDetails>;
  settlement: Partial<Settlement>;
  consent: Partial<Consent>;
  outletSales?: OutletSalesSplit;
  outletDelivery?: OutletDeliverySplit;

  // Metadata
  status: 'draft' | 'submitted';
  createdAt: string;
  updatedAt: string;

  // Demo — sent invite emails (persisted so confirmation page can show them)
  sentEmails: Array<{
    personName: string;
    personEmail: string;
    html: string;
    sentAt: string;
  }>;

  // UI state
  isLoading: boolean;
  errors: Record<string, string>;
  /**
   * Autofill runs in the background from step 1 but its results land on step 2.
   * Steps read this so a merchant who clicks through fast sees "still looking"
   * rather than a page of blank fields that fill in underneath them.
   */
  autofillStatus: 'idle' | 'loading' | 'success' | 'error';
}

export interface OnboardingActions {
  // Navigation
  setCurrentStep: (step: number) => void;

  // Section updates
  updateCompany: (data: Partial<CompanyInfo>) => void;
  updateBusiness: (data: Partial<BusinessDetails>) => void;

  // People management
  addPerson: (person: Person) => void;
  updatePerson: (id: string, data: Partial<Person>) => void;
  removePerson: (id: string) => void;

  // Corporate shareholders
  addCorporateShareholder: (entry: CorporateShareholder) => void;
  updateCorporateShareholder: (id: string, data: Partial<CorporateShareholder>) => void;
  removeCorporateShareholder: (id: string) => void;

  // More section updates
  updateTransactions: (data: Partial<TransactionDetails>) => void;
  updateSettlement: (data: Partial<Settlement>) => void;
  updateConsent: (data: Partial<Consent>) => void;
  updateOutletSales: (data: Partial<OutletSalesSplit>) => void;
  updateOutletDelivery: (data: Partial<OutletDeliverySplit>) => void;

  // Contact info
  setContactInfo: (email: string, phone: string) => void;

  // UI helpers
  setLoading: (loading: boolean) => void;
  setAutofillStatus: (status: OnboardingState['autofillStatus']) => void;
  setError: (key: string, message: string) => void;
  clearError: (key: string) => void;

  // Demo — track sent emails
  addSentEmail: (email: { personName: string; personEmail: string; html: string; sentAt: string }) => void;

  // Reset
  resetApplication: () => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

// ---------------------------------------------------------------------------
// Initial state factory
// ---------------------------------------------------------------------------

const createInitialState = (): OnboardingState => ({
  id: uuidv4(),
  currentStep: 1,
  contactEmail: '',
  contactPhone: '',
  company: {},
  business: {},
  people: [],
  corporateShareholders: [],
  transactions: {},
  settlement: {},
  consent: {},
  outletSales: undefined,
  outletDelivery: undefined,
  sentEmails: [],
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isLoading: false,
  errors: {},
  autofillStatus: 'idle',
});

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...createInitialState(),

      // -- Navigation --------------------------------------------------------

      setCurrentStep: (step) =>
        set({
          currentStep: Math.min(Math.max(step, FIRST_STEP), LAST_STEP),
          updatedAt: new Date().toISOString(),
        }),

      // -- Company -----------------------------------------------------------

      updateCompany: (data) =>
        set((state) => ({
          company: { ...state.company, ...data },
          updatedAt: new Date().toISOString(),
        })),

      // -- Business ----------------------------------------------------------

      updateBusiness: (data) =>
        set((state) => ({
          business: { ...state.business, ...data },
          updatedAt: new Date().toISOString(),
        })),

      // -- People ------------------------------------------------------------

      addPerson: (person) =>
        set((state) => ({
          people: [...state.people, person],
          updatedAt: new Date().toISOString(),
        })),

      updatePerson: (id, data) =>
        set((state) => ({
          people: state.people.map((p) =>
            p.id === id ? { ...p, ...data } : p,
          ),
          updatedAt: new Date().toISOString(),
        })),

      removePerson: (id) =>
        set((state) => ({
          people: state.people.filter((p) => p.id !== id),
          updatedAt: new Date().toISOString(),
        })),

      // -- Corporate shareholders --------------------------------------------

      addCorporateShareholder: (entry) =>
        set((state) => ({
          corporateShareholders: [...state.corporateShareholders, entry],
          updatedAt: new Date().toISOString(),
        })),

      updateCorporateShareholder: (id, data) =>
        set((state) => ({
          corporateShareholders: state.corporateShareholders.map((s) =>
            s.id === id ? { ...s, ...data } : s,
          ),
          updatedAt: new Date().toISOString(),
        })),

      removeCorporateShareholder: (id) =>
        set((state) => ({
          corporateShareholders: state.corporateShareholders.filter(
            (s) => s.id !== id,
          ),
          updatedAt: new Date().toISOString(),
        })),

      // -- Transactions ------------------------------------------------------

      updateTransactions: (data) =>
        set((state) => ({
          transactions: { ...state.transactions, ...data },
          updatedAt: new Date().toISOString(),
        })),

      // -- Settlement --------------------------------------------------------

      updateSettlement: (data) =>
        set((state) => ({
          settlement: { ...state.settlement, ...data },
          updatedAt: new Date().toISOString(),
        })),

      // -- Consent -----------------------------------------------------------

      updateConsent: (data) =>
        set((state) => ({
          consent: { ...state.consent, ...data },
          updatedAt: new Date().toISOString(),
        })),

      updateOutletSales: (data) =>
        set((state) => ({
          outletSales: {
            ftf: state.outletSales?.ftf ?? 0,
            internet: state.outletSales?.internet ?? 0,
            moto: state.outletSales?.moto ?? 0,
            ...data,
          },
          updatedAt: new Date().toISOString(),
        })),

      updateOutletDelivery: (data) =>
        set((state) => ({
          outletDelivery: {
            d0: state.outletDelivery?.d0 ?? 0,
            d1to7: state.outletDelivery?.d1to7 ?? 0,
            d8to14: state.outletDelivery?.d8to14 ?? 0,
            d15to30: state.outletDelivery?.d15to30 ?? 0,
            dOver30: state.outletDelivery?.dOver30 ?? 0,
            ...data,
          },
          updatedAt: new Date().toISOString(),
        })),

      // -- Contact info ------------------------------------------------------

      setContactInfo: (email, phone) =>
        set({
          contactEmail: email,
          contactPhone: phone,
          updatedAt: new Date().toISOString(),
        }),

      // -- UI helpers --------------------------------------------------------

      setLoading: (loading) => set({ isLoading: loading }),

      setAutofillStatus: (status) => set({ autofillStatus: status }),

      setError: (key, message) =>
        set((state) => ({
          errors: { ...state.errors, [key]: message },
        })),

      clearError: (key) =>
        set((state) => {
          const rest = { ...state.errors };
          delete rest[key];
          return { errors: rest };
        }),

      // -- Demo — sent emails ------------------------------------------------

      addSentEmail: (email) =>
        set((state) => ({
          sentEmails: [...state.sentEmails, email],
          updatedAt: new Date().toISOString(),
        })),

      // -- Reset -------------------------------------------------------------

      resetApplication: () => set(createInitialState()),
    }),
    {
      name: 'surfboard-onboarding',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // v1 was the six-step wizard. A draft saved on old step 4, 5 or 6 would
      // otherwise rehydrate onto a step that no longer exists; map it onto the
      // step that now covers the same ground. Collected data is untouched.
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Partial<OnboardingState>;
        if (version < 2 && typeof state.currentStep === 'number') {
          const SIX_TO_THREE: Record<number, number> = {
            1: 1, 2: 2, 3: 3, 4: 2, 5: 3, 6: 3,
          };
          state.currentStep = SIX_TO_THREE[state.currentStep] ?? FIRST_STEP;
        }
        return state as OnboardingState;
      },
    },
  ),
);
