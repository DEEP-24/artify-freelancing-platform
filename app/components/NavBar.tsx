import { ActionIcon, Avatar, Menu } from "@mantine/core"
import { Form, Link, NavLink } from "@remix-run/react"
import { ChevronDownIcon } from "lucide-react"
import { useOptionalUser } from "~/utils/misc"

type NavItem = {
  title: string
  href: string
}

type NavBarProps = {
  navItems: NavItem[]
}

export default function NavBar(props: NavBarProps) {
  const { navItems } = props
  const user = useOptionalUser()

  return (
    <>
      <div className="flex h-10 items-center justify-between bg-black p-8">
        <div className="flex items-center">
          <div className="flex items-center justify-center">
            <Link to="/">
              <img src="/img/logo.png" alt="logo" className="h-16 w-24" />
            </Link>
          </div>
        </div>
        <div className="flex justify-between gap-12">
          {navItems.map((navItem, idx) => (
            <div key={idx}>
              <NavLink
                to={navItem.href}
                end
                className={({ isActive }) =>
                  `text-lg ${
                    isActive ? "text-red-600" : "text-white"
                  } hover:text-red-600`
                }
              >
                {navItem.title}
              </NavLink>
            </div>
          ))}
        </div>

        <div className="flex items-center hover:cursor-pointer">
          <Menu
            shadow="xl"
            width={200}
            position="bottom-end"
            transitionProps={{ transition: "rotate-left", duration: 150 }}
          >
            <Menu.Target>
              <div>
                {user ? (
                  <>
                    <div className="border-1 flex items-center justify-between gap-2">
                      <Avatar src="" alt="" radius="lg" color="red">
                        {user.name.charAt(0)}
                      </Avatar>
                      <div className="flex items-center ">
                        <p className="text-xs text-white">{user.name}</p>
                      </div>
                      <div>
                        <ActionIcon variant="transparent" color="white">
                          <ChevronDownIcon size={10} />
                        </ActionIcon>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar src="" alt="" radius="lg" color="red" />
                  </>
                )}
              </div>
            </Menu.Target>
            <Menu.Dropdown>
              {user ? (
                <>
                  <Menu.Item className="text-gray-800" disabled>
                    {user.name}
                  </Menu.Item>
                  <Menu.Item disabled>{user.email}</Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    component={Form}
                    action="/logout"
                    method="post"
                    className="flex items-center justify-start"
                  >
                    <button type="submit" className="w-full text-left">
                      Logout
                    </button>
                  </Menu.Item>
                </>
              ) : (
                <>
                  <Menu.Item component={Link} to="/login">
                    Login
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item component={Link} to="/register">
                    Create account
                  </Menu.Item>
                </>
              )}
            </Menu.Dropdown>
          </Menu>
        </div>
      </div>
    </>
  )
}
