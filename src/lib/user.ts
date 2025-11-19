import { prisma } from "./prisma";

export const incrementLikesUsed = async (userId: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { totalLikesUsed: { increment: 1 } },
    select: { totalLikesUsed: true },
  });
};

export const decrementLikesUsed = async (userId: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { totalLikesUsed: { decrement: 1 } },
    select: { totalLikesUsed: true },
  });
};

export const decrementTicket = async (userId: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { gachaTickets: { decrement: 1 } },
    select: { gachaTickets: true },
  });
};

export const incrementTickets = async (userId: string, count: number) => {
  return prisma.user.update({
    where: { id: userId },
    data: { gachaTickets: { increment: count } },
    select: { gachaTickets: true },
  });
};
