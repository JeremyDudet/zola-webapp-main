import { useState, useCallback, useEffect, useMemo } from 'react'
import { trpc } from '../../utils/trpc'
import {
  Heading,
  Stack,
  Flex,
  Button,
  Spinner,
  Center,
  useDisclosure,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  CheckboxGroup,
  Checkbox,
  Text
} from '@chakra-ui/react'
import { AddIcon } from '@chakra-ui/icons'
import DishCard from '../../components/DishCard'
import LoginForm from '../../components/LoginForm'
import NewDishModal from '../../components/NewDishModal'
import { useAuthContext } from '../../context/AuthContext'
import type { Dish, Menu, NewDish, UpdateDish } from '../../types'

const FilterAccordion = (props: any) => {
  const menuIds: string[] = []
  props.menus.forEach((menu: Menu) => menuIds.push(menu.id))

  return (
    <Accordion allowToggle>
      <AccordionItem>
        <h2>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              Filters
            </Box>
            <AccordionIcon />
          </AccordionButton>
        </h2>
        <AccordionPanel pb={4}>
          <Box>
            <Heading size="xs">Filter By Menu</Heading>
          </Box>
          <CheckboxGroup
            defaultValue={menuIds}
            onChange={value => props.setFilteredMenus(value)}
          >
            <Flex gap="12px" wrap="wrap">
              {props.menus.map((menu: any) => (
                <Checkbox
                  textTransform="capitalize"
                  key={menu.id}
                  value={menu.id}
                  isChecked={props.filteredMenus?.includes(menu.id)}
                >
                  {menu.name}
                </Checkbox>
              ))}
            </Flex>
          </CheckboxGroup>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  )
}

export default function Index() {
  const { user } = useAuthContext()
  const getFoodMenus = trpc.useQuery(['menus.getFoodMenus']) // grab all the menus that are of menuType 'food'
  const getAllergens = trpc.useQuery(['allergens.getAllergens'])
  const createDish = trpc.useMutation('dishes.createDish')
  const getActiveDishes = trpc.useQuery(['dishes.getActiveDishes'])
  const updateDish = trpc.useMutation('dishes.updateDish')
  const deleteDish = trpc.useMutation('dishes.deleteDish')

  const [filteredMenuIds, setFilteredMenuIds] = useState<string[]>()

  const { isOpen, onOpen, onClose } = useDisclosure()

  const menuIds = useMemo(
    () => getFoodMenus.data?.map((menu: any) => menu.id),
    [getFoodMenus.data]
  )

  const allergens = useMemo(() => getAllergens.data, [getAllergens.data])

  useEffect(() => {
    // when food menus are loaded, set all of them to filteredMenus
    setFilteredMenuIds(menuIds)
  }, [menuIds])

  const handleDishDelete = useCallback(
    async (uid: string) => {
      try {
        await deleteDish.mutateAsync({ id: uid })
        getActiveDishes.refetch()
      } catch (error) {
        // handle error
        console.log(error)
      }
    },
    [deleteDish, getActiveDishes]
  )

  // update the dishes state and also grab the image id for cloudinary
  const handleDishUpdate = useCallback(
    async (data: UpdateDish) => {
      try {
        const updatedDish = await updateDish.mutateAsync(data)
        if (updatedDish && updatedDish.imageId) {
          // if there is an image id, delete it from cloudinary
          // TODO: delete image from cloudinary
        }
        getActiveDishes.refetch()
      } catch (error) {
        // handle error
        console.log(error)
      }
    },
    [updateDish, getActiveDishes]
  )

  const handleCreateDish = useCallback(
    async (data: NewDish) => {
      try {
        await createDish.mutateAsync(data, {
          onSuccess: () => {
            // regresh the getActiveDishes query to show the new dish
            getActiveDishes.refetch()
          },
          onError: error => {
            // handle error
            console.log(error)
          }
        })
      } catch (error) {
        // handle error
        console.log(error)
      }
    },
    [createDish, getActiveDishes]
  )

  // grab all the dishes that belong to a specific menu
  function grabFilteredDishes(menuId: any) {
    const filteredDishesByMenu: Dish[] = [] // array of dishes that are in the assigned menu section
    // loop through all the active dishes
    getActiveDishes.data?.forEach((dish: any) => {
      // loop through all the menus in each dish
      dish.menu?.forEach((menu: Menu) => {
        // if the dish is in the menu, push it to the filtered dishes array
        if (menu.id === menuId) {
          filteredDishesByMenu.push(dish)
        }
      })
    })
    return filteredDishesByMenu
  }

  // grab a menu's name from the menu id
  // Create an object that maps menuIDs to menu names
  const menuIdToName = useMemo(() => {
    const menuIdToName: Record<string, string> = {}
    getFoodMenus.data?.forEach((menu: any) => {
      menuIdToName[menu.id] = menu.name
    })
    return menuIdToName
  }, [getFoodMenus.data])

  if (!user.firstName) return <LoginForm /> // if user is not logged in, return Auth component

  if (!getFoodMenus.data || !getActiveDishes.data || !allergens) {
    return (
      <Center paddingTop={16}>
        <Spinner size="xl" />
      </Center>
    )
  }

  return (
    <>
      <NewDishModal
        isOpen={isOpen}
        onClose={onClose}
        handleCreateDish={handleCreateDish}
        uid={user.id}
        allergens={allergens}
        menus={getFoodMenus.data}
      />
      <Stack>
        <Flex justify="space-between">
          <Heading>{'Food Notes'}</Heading>
          <Button
            onClick={onOpen}
            variant="outline"
            leftIcon={<AddIcon />}
            colorScheme="green"
            style={{
              display: `${
                user.auth === 'admin' || user.auth === 'kitchen' ? '' : 'none'
              }`
            }}
          >
            New Dish
          </Button>
        </Flex>
        {/* <SearchBar
          search={search}
          setSearch={setSearch}
          placeholder="Search by name, component, allergen, or menu"
        /> */}
        <FilterAccordion
          menus={getFoodMenus.data}
          setFilteredMenus={setFilteredMenuIds}
          filteredMenus={filteredMenuIds}
        />
        <Stack spacing={8} pt={4}>
          {filteredMenuIds?.map(id => (
            <Box key={id}>
              <Heading>{menuIdToName[id]}</Heading>
              <Stack spacing={4}>
                {grabFilteredDishes(id).length > 0 ? (
                  grabFilteredDishes(id).map((dish: any) => (
                    <DishCard
                      key={dish.id}
                      dish={dish}
                      handleDishUpdate={handleDishUpdate}
                      userAuth={user.auth}
                      allergens={allergens}
                      menus={getFoodMenus.data}
                      uid={user.id}
                      handleDishDelete={handleDishDelete}
                    />
                  ))
                ) : (
                  <Text>No dishes in this menu</Text>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>
    </>
  )
}
