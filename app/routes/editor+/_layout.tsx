import { ScrollArea } from "@mantine/core"
import { redirect, type LoaderFunctionArgs } from "@remix-run/node"
import { Outlet } from "@remix-run/react"
import NavBar from "~/components/NavBar"
import { getUserId, getUserRole, isAdmin, isCustomer } from "~/session.server"

export const editorActions = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "Posts",
    href: "/editor/posts",
  },
  {
    title: "Projects",
    href: "/editor/projects",
  },
]

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request)
  const userRole = await getUserRole(request)

  if (!userId || !userRole) {
    return null
  }

  if (await isAdmin(request)) {
    return redirect("/admin")
  } else if (await isCustomer(request)) {
    return redirect("/editor")
  }

  return null
}

export default function CustomerLayout() {
  return (
    <div className="flex h-full flex-col">
      <NavBar navItems={editorActions} />
      <ScrollArea className="flex-1 bg-black">
        <Outlet />
      </ScrollArea>
      <div className="flex items-center justify-center bg-black">
        <p className="p-3 text-lg font-semibold text-white">
          Copyright &copy; 2023-30 | All Rights Reserved{" "}
        </p>
        S
      </div>
    </div>
  )
}
