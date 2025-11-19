import { prisma } from "./prisma";
import {
  createSessionToken,
  getSessionToken,
  setSessionCookie,
} from "./session";

export const sanitizeUser = (user: {
  id: string;
  gachaTickets: number;
  totalLikesUsed: number;
  walletAddress: string | null;
}) => ({
  id: user.id,
  gachaTickets: user.gachaTickets,
  totalLikesUsed: user.totalLikesUsed,
  walletAddress: user.walletAddress,
});

export const getCurrentUser = async () => {
  const token = await getSessionToken();
  if (!token) return null;
  return prisma.user.findUnique({ where: { guestId: token } });
};

export const ensureGuestUser = async () => {
  const existingToken = await getSessionToken();
  if (existingToken) {
    const user = await prisma.user.findUnique({
      where: { guestId: existingToken },
    });
    if (user) {
      // refresh cookie
      await setSessionCookie(existingToken);
      return user;
    }
  }

  const token = createSessionToken();
  const user = await prisma.user.create({
    data: {
      guestId: token,
      gachaTickets: 3,
      totalLikesUsed: 0,
    },
  });
  await setSessionCookie(token);
  return user;
};
