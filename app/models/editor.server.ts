import * as bcrypt from "bcryptjs"
import { db as prisma } from "~/db.server"
import { getUserId, logout } from "~/session.server"
import type { Editor } from "@prisma/client"

export async function verifyEditorLogin({
  email,
  password,
}: {
  email: Editor["email"]
  password: string
}) {
  const editorWithPassword = await prisma.editor.findUnique({
    where: { email },
  })

  if (!editorWithPassword || !editorWithPassword.password) {
    return null
  }

  const isValid = await bcrypt.compare(password, editorWithPassword.password)

  if (!isValid) {
    return null
  }

  const { password: _password, ...editorWithoutPassword } = editorWithPassword

  return editorWithoutPassword
}

export async function getEditorById(id: Editor["id"]) {
  return prisma.editor.findUnique({
    where: { id },
  })
}

export async function getEditor(request: Request) {
  const editorId = await getUserId(request)
  if (editorId === undefined) return null

  const editor = await getEditorById(editorId)
  if (editor) return editor

  throw await logout(request)
}

export async function getEditorByEmail(email: Editor["email"]) {
  return prisma.editor.findUnique({
    where: { email },
    select: {
      name: true,
      email: true,
    },
  })
}

export async function createEditor({
  name,
  email,
  password,
  experience,
  portfolio,
  skills,
  awards,
}: {
  name: Editor["name"]
  email: Editor["email"]
  password: string
  experience: Editor["experience"]
  portfolio: Editor["portfolio"]
  skills: Editor["skills"]
  awards: Editor["awards"]
}) {
  const hashedPassword = await bcrypt.hash(password, 10)

  const editor = await prisma.editor.create({
    data: {
      name,
      email,
      password: hashedPassword,
      experience,
      portfolio,
      skills,
      awards,
    },
  })

  return editor
}
