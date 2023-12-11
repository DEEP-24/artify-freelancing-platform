import * as bcrypt from "bcryptjs"
import { db as prisma } from "~/db.server"
import { getUserId, logout } from "~/session.server"
import type { Customer } from "@prisma/client"

export async function verifyCustomerLogin({
  email,
  password,
}: {
  email: Customer["email"]
  password: string
}) {
  const customerWithPassword = await prisma.customer.findUnique({
    where: { email },
  })

  if (!customerWithPassword || !customerWithPassword.password) {
    return null
  }

  const isValid = await bcrypt.compare(password, customerWithPassword.password)

  if (!isValid) {
    return null
  }

  const { password: _password, ...customerWithoutPassword } =
    customerWithPassword

  return customerWithoutPassword
}

export async function getCustomerById(id: Customer["id"]) {
  return prisma.customer.findUnique({
    where: { id },
  })
}

export async function getCustomer(request: Request) {
  const customerId = await getUserId(request)
  if (customerId === undefined) return null

  const customer = await getCustomerById(customerId)
  if (customer) return customer

  throw await logout(request)
}

export async function getCustomerByEmail(email: Customer["email"]) {
  return prisma.customer.findUnique({
    where: { email },
    select: {
      name: true,
      email: true,
    },
  })
}

export async function createCustomer({
  name,
  email,
  password,
}: {
  name: Customer["name"]
  email: Customer["email"]
  password: string
}) {
  const hashedPassword = await bcrypt.hash(password, 10)
  const customer = await prisma.customer.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  })

  return customer
}
