
local function setup()
	vim.cmd([[
        autocmd BufRead,BufNewFile *.lml set filetype=lml
        autocmd Syntax lml runtime! syntax/lml.vim
    ]])
end

return {
	setup = setup,
}
