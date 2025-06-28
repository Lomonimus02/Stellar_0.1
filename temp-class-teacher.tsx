{/* Управление классом для классного руководителя */}
{form.watch("role") === UserRoleEnum.CLASS_TEACHER && (
  <FormField
    control={form.control}
    name="classIds"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Класс</FormLabel>
        <FormDescription>
          Выберите класс, которым будет руководить классный руководитель
        </FormDescription>
        <div className="mt-2">
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет доступных классов</p>
          ) : (
            <Select
              onValueChange={(value) => {
                const classId = parseInt(value);
                field.onChange([classId]); // Устанавливаем только один класс
              }}
              value={field.value?.[0]?.toString() || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите класс" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <FormMessage />
      </FormItem>
    )}
  />
)}