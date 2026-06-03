"use client"

import {
  ComponentProps,
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import * as BasePhoneInput from "react-phone-number-input"
import flags from "react-phone-number-input/flags"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { HugeiconsIcon } from "@hugeicons/react"
import { Globe02Icon, Search01Icon } from "@hugeicons/core-free-icons"

type PhoneInputSize = "sm" | "default" | "lg"

const PhoneInputContext = createContext<{
  variant: PhoneInputSize
  popupClassName?: string
  scrollAreaClassName?: string
}>({
  variant: "default",
  popupClassName: undefined,
  scrollAreaClassName: undefined,
})

type PhoneInputProps = Omit<
  ComponentProps<"input">,
  "onChange" | "value" | "ref"
> &
  Omit<
    BasePhoneInput.Props<typeof BasePhoneInput.default>,
    "onChange" | "variant" | "popupClassName" | "scrollAreaClassName"
  > & {
    onChange?: (value: BasePhoneInput.Value) => void
    variant?: PhoneInputSize
    popupClassName?: string
    scrollAreaClassName?: string
  }

const PhonePortalContext = createContext<
  React.RefObject<HTMLDivElement | null> | null
>(null)

function PhoneInput({
  className,
  variant,
  popupClassName,
  scrollAreaClassName,
  onChange,
  value,
  ...props
}: PhoneInputProps) {
  const phoneInputSize = variant || "default"
  const portalRef = useRef<HTMLDivElement>(null)
  return (
    <PhoneInputContext.Provider
      value={{ variant: phoneInputSize, popupClassName, scrollAreaClassName }}
    >
      <PhonePortalContext.Provider value={portalRef}>
        <BasePhoneInput.default
          className={cn(
            "flex",
            props["aria-invalid"] &&
              "[&_*[data-slot=combobox-trigger]]:border-destructive [&_*[data-slot=combobox-trigger]]:ring-destructive/50",
            className
          )}
          flagComponent={FlagComponent}
          countrySelectComponent={CountrySelect}
          inputComponent={InputComponent}
          smartCaret={false}
          value={value || undefined}
          onChange={(value) => onChange?.(value || ("" as BasePhoneInput.Value))}
          {...props}
        />
        <div ref={portalRef} />
      </PhonePortalContext.Provider>
    </PhoneInputContext.Provider>
  )
}

function InputComponent({ className, ...props }: ComponentProps<typeof Input>) {
  const { variant } = useContext(PhoneInputContext)

  return (
    <Input
      className={cn(
        "rounded-s-none focus:z-1",
        variant === "sm" && "h-8",
        variant === "lg" && "h-10",
        className
      )}
      {...props}
    />
  )
}

type CountryEntry = { label: string; value: BasePhoneInput.Country | undefined }

type CountrySelectProps = {
  disabled?: boolean
  value: BasePhoneInput.Country
  options: CountryEntry[]
  onChange: (country: BasePhoneInput.Country) => void
}

function CountrySelect({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) {
  const { variant, popupClassName } = useContext(PhoneInputContext)
  const portalContainerRef = useContext(PhonePortalContext)
  const [searchValue, setSearchValue] = useState("")

  const filteredCountries = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return countryList
    const digits = q.replace(/^\+/, "")
    return countryList.filter(({ label, value }) => {
      if (!value) return false
      if (label.toLowerCase().includes(q)) return true
      if (digits) {
        const code = BasePhoneInput.getCountryCallingCode(value)
        if (code.includes(digits)) return true
      }
      return false
    })
  }, [countryList, searchValue])

  return (
    <Combobox
      value={selectedCountry || ""}
      onValueChange={(country: BasePhoneInput.Country | null) => {
        if (country) {
          onChange(country)
          setSearchValue("")
        }
      }}
      onOpenChange={(open) => {
        if (!open) setSearchValue("")
      }}
    >
      <ComboboxTrigger
        render={
          <Button
            variant="outline"
            size={variant}
            className={cn(
              "rounded-s-md rounded-e-none flex gap-1 border-e-0 px-2.5 py-0 leading-none hover:bg-transparent focus:z-10 data-pressed:bg-transparent",
              disabled && "opacity-50"
            )}
            disabled={disabled}
          >
            <span className="sr-only">
              <ComboboxValue />
            </span>
            <FlagComponent
              country={selectedCountry}
              countryName={selectedCountry}
            />
          </Button>
        }
      />
      <ComboboxContent
        container={portalContainerRef ?? undefined}
        sideOffset={8}
        className={cn(
          "flex h-[360px] max-h-[var(--available-height)] w-[320px] max-w-[calc(100vw-2rem)] flex-col p-0",
          popupClassName
        )}
      >
        <div className="shrink-0 border-b border-border bg-popover p-2">
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              strokeWidth={2}
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <ComboboxPrimitive.Input
              placeholder="Search country…"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-input/30 pr-3 pl-8 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-0"
            />
          </div>
        </div>

        {filteredCountries.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4 py-6 text-center text-sm text-muted-foreground">
            No country found.
          </div>
        ) : (
          <ComboboxList className="max-h-none! min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-1">
            {filteredCountries.map((item) =>
              item.value ? (
                <ComboboxItem
                  key={item.value}
                  value={item.value}
                  className="flex items-center gap-2"
                >
                  <FlagComponent
                    country={item.value}
                    countryName={item.label}
                  />
                  <span className="flex-1 truncate text-sm">{item.label}</span>
                  <span className="text-sm text-foreground/50">
                    {`+${BasePhoneInput.getCountryCallingCode(item.value)}`}
                  </span>
                </ComboboxItem>
              ) : null
            )}
          </ComboboxList>
        )}
      </ComboboxContent>
    </Combobox>
  )
}

function FlagComponent({ country, countryName }: BasePhoneInput.FlagProps) {
  const Flag = flags[country]

  return (
    <span className="flex h-4 w-4 items-center justify-center [&_svg:not([class*='size-'])]:size-full! [&_svg:not([class*='size-'])]:rounded-[5px]">
      {Flag ? (
        <Flag title={countryName} />
      ) : (
        <HugeiconsIcon
          icon={Globe02Icon}
          strokeWidth={2}
          className="size-4 opacity-60"
        />
      )}
    </span>
  )
}

export { PhoneInput }
