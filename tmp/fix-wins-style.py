file = 'app/records/Wins/Wins.tsx'
with open(file, 'r', encoding='utf-8') as f:
    c = f.read()

# Player links: add ! prefix for colors (no underline)
c = c.replace('className="text-cyan-300 hover:text-cyan-100 font-semibold"', 'className="!text-cyan-300 hover:!text-cyan-100 font-semibold"')

# Tournament links: add ! prefix for colors (no underline)
c = c.replace('className="text-orange-300 hover:text-orange-100 font-semibold"', 'className="!text-orange-300 hover:!text-orange-100 font-semibold"')

# Numbers in <span>: add ! prefix
c = c.replace('className="text-amber-300 font-semibold"', 'className="!text-amber-300 font-semibold"')

# Numbers in <strong>: add ! prefix
c = c.replace('className="text-amber-300"', 'className="!text-amber-300"')

with open(file, 'w', encoding='utf-8') as f:
    f.write(c)

print('Done')
